'use strict';

var vars = require('./vars');

class Player {
	constructor(cheat, utils, entity){
		this.cheat = cheat;
		this.utils = utils;
		this.entity = typeof entity == 'object' && entity != null ? entity : {};
	}
	distance_to(point){
		return Math.hypot(this.x - point.x, this.y - point.y, this.z - point.z)
	}
	get x(){ return this.entity.x || 0 }
	get y(){ return this.entity.y || 0 }
	get z(){ return this.entity.z || 0 }
	get parts(){ return this.store.parts }
	// cached cpu-heavy data such as world_pos or can_see
	get store(){ return this.entity[Player.store] || (this.entity[Player.store] = {}) }
	get can_see(){ return this.store.can_see }
	get in_fov(){
		if(!this.active)return false;
		if(this.cheat.config.aim.fov == 110)return true;
		
		var fov_bak = this.cheat.world.camera.fov;
		
		// config fov is percentage of current fov
		this.cheat.world.camera.fov = this.cheat.config.aim.fov / fov_bak * 100;
		this.cheat.world.camera.updateProjectionMatrix();
		
		this.cheat.update_frustum();
		var ret = this.frustum;
		
		this.cheat.world.camera.fov = fov_bak;
		this.cheat.world.camera.updateProjectionMatrix();
		
		return ret;
	}
	get can_target(){
		return this.active && this.enemy && this.can_see && this.in_fov;
	}
	get frustum(){
		return this.active ? this.cheat.contains_point(this) : false;
	}
	get hp_color(){
		var hp_perc = (this.health / this.max_health) * 100,
			hp_red = hp_perc < 50 ? 255 : Math.round(510 - 5.10 * hp_perc),
			hp_green = hp_perc < 50 ? Math.round(5.1 * hp_perc) : 255;
		
		return '#' + ('000000' + (hp_red * 65536 + hp_green * 256 + 0 * 1).toString(16)).slice(-6);
	}
	get esp_color(){
		// teammate = green, enemy = red, risk + enemy = orange
		var hex = this.enemy ? this.risk ? [ 0xFF, 0x77, 0x00 ] : [ 0xFF, 0x00, 0x00 ] : [ 0x00, 0xFF, 0x00 ],
			inc = this.can_see ? 0x00 : -0x77,
			part_str = part => Math.max(Math.min(part + inc, 0xFF), 0).toString(16).padStart(2, 0);
		
		return '#' + hex.map(part_str).join('');
	}
	get ping(){ return this.entity.ping }
	get jump_bob_y(){ return this.entity.jumpBobY }
	get clan(){ return this.entity.clan }
	get alias(){ return this.entity.alias }
	get weapon(){ return this.entity.weapon }
	get can_slide(){ return this.entity.canSlide }
	// not to be confused with social player values 
	get risk(){ return this.entity.account && (this.entity.account.featured || this.entity.account.premiumT) || this.entity.level >= 30 }
	get is_you(){ return this.entity[vars.isYou] }
	get aim_val(){ return this.entity[vars.aimVal] }
	get y_vel(){ return this.entity[vars.yVel] }
	get aim(){ return this.weapon.noAim || !this.aim_val || this.cheat.target && this.cheat.target.active && this.weapon.melee && this.distance_to(this.cheat.target) <= 18 }
	get aim_press(){ return this.cheat.controls[vars.mouseDownR] || this.cheat.controls.keys[this.cheat.controls.binds.aim.val] }
	get crouch(){ return this.entity[vars.crouchVal] }
	// buggy
	bounds(){
		return {
			min: this.utils.pos2d(this.store.box.min),
			max: this.utils.pos2d(this.store.box.max),
		};
	}
	rect(){
		// hitbox rect, add a accurate player rect similar to junker
		var src_pos = this.utils.pos2d(this),
			src_pos_crouch = this.utils.pos2d(this, this.height),
			width = ~~((src_pos.y - this.utils.pos2d(this, this.entity.height).y) * 0.7),
			height = src_pos.y - src_pos_crouch.y,
			center = {
				x: src_pos.x,
				y: src_pos.y - height / 2,
			};
		
		return {
			x: center.x,
			y: center.y,
			left: center.x - width / 2,
			top: center.y - height / 2,
			right: center.x + width / 2,
			bottom: center.y + height / 2,
			width: width,
			height: height,
		};
	}
	distance_camera(){
		return this.cheat.world.camera[vars.getWorldPosition]().distanceTo(this);
	}
	get world_pos(){
		return this.store.world_pos;
	}
	get obj(){ return this.is_ai ? target.enity.dat : this.entity[vars.objInstances] }
	get recoil_y(){ return this.entity[vars.recoilAnimY] }
	get has_ammo(){ return this.weapon.melee || this.ammo }
	get ammo(){ return this.entity[vars.ammos][this.entity[vars.weaponIndex]] }
	get height(){ return (this.entity.height || 0) - this.entity[vars.crouchVal] * 3 }
	get health(){ return this.entity.health || 0 }
	get max_health(){ return this.entity[vars.maxHealth] || 100 }
	//  && (this.is_you ? true : this.chest && this.leg)
	get active(){ return this.entity.active && this.entity.x != null && this.health > 0 && this.obj }
	get teammate(){ return this.is_you || this.cheat.player && this.team && this.team == this.cheat.player.team }
	get enemy(){ return !this.teammate }
	get team(){ return this.entity.team }
	get auto_weapon(){ return !this.weapon.nAuto }
	get shot(){ return this.auto_weapon ? this.store.shot : this.entity[vars.didShoot] }
	get chest(){
		return this.obj && this.obj.children[0] && this.obj.children[0].children[4] && this.obj.children[0].children[4].children[0];
		
		var found;
		// console.log(this.chest.parent.position, this.leg.scale);
		if(this.obj)this.obj.traverse(obj => {
			if(this.cheat.test_vec(obj.parent.position, [ 0, 4.2, 0 ]) && this.cheat.test_vec(obj.scale, [ 1, 1, 1 ]))found = obj;
		});
		
		return found;
	}
	get leg(){
		return this.obj && this.obj.children[0] && this.obj.children[0].children[0];
		
		var found;
		
		if(this.obj)this.obj.traverse(obj => {
			if(this.cheat.test_vec(obj.scale, [ 1.3, 4.2, 1.3 ]))found = obj;
		});
		
		return found;
	}
	tick(){
		/*this.store.box = new this.cheat.three.Box3();
		
		if(this.active)this.obj.traverse(obj => {
			if(obj.visible && obj.type == 'Mesh')this.store.box.expandByObject(this.obj);;
		});*/
		
		this.store.can_see = this.cheat.player && this.active && this.utils.obstructing(this.cheat.player, this, this.cheat.player.weapon && this.cheat.player.weapon.pierce && this.cheat.config.aim.wallbangs) == null ? true : false;
		
		this.store.parts = {
			torso: { x: 0, y: 0, z: 0 },
			head: { x: 0, y: 0, z: 0 },
			legs: { x: 0, y: 0, z: 0 },
		};
		
		// config.js
		var head_size = 1.5;
		
		if(this.active && !this.is_you && this.chest && this.leg){
			var chest_box = new this.cheat.three.Box3().setFromObject(this.chest),
				chest_size = chest_box.getSize(),
				chest_pos = chest_box.getCenter(),
				// rotated offset
				translate = (obj, input, translate) => {
					for(var axis in translate){
						var ind = ['x','y','z'].indexOf(axis),
							pos = new this.cheat.three.Vector3(...[0,0,0].map((x, index) => ind == index ? 1 : 0)).applyQuaternion(obj.getWorldQuaternion()).multiplyScalar(translate[axis]);
						
						input.x += pos.x;
						input.y += pos.y;
						input.z += pos.z;
					}
					
					return input;
				};
			
			// parts centered
			this.store.parts.torso = translate(this.chest, {
				x: chest_pos.x,
				y: chest_pos.y,
				z: chest_pos.z,
				height: chest_size.y - head_size,
			}, {
				y: -head_size / 2,
			});
			
			this.store.parts.head = translate(this.chest, {
				x: chest_pos.x,
				y: chest_pos.y,
				z: chest_pos.z,
			}, {
				y: this.store.parts.torso.height / 2,
			});
			
			var leg_pos = this.leg[vars.getWorldPosition](),
				leg_scale = this.leg.getWorldScale();
			
			this.store.parts.legs = translate(this.leg, {
				x: leg_pos.x,
				y: leg_pos.y,
				z: leg_pos.z,
			}, {
				x: -leg_scale.x / 2,
				y: -leg_scale.y / 2,
			});
		}
		
		if(this.active)this.store.world_pos = this.active ? this.obj[vars.getWorldPosition]() : { x: 0, y: 0, z: 0 };
	}
};

Player.store = Symbol();

module.exports = Player;