'use strict';

var vars = require('./vars'),
	y_offset_types = ['head', 'torso', 'legs'],
	y_offset_rand = 'head';

setInterval(() => y_offset_rand = y_offset_types[~~(Math.random() * y_offset_types.length)], 2000);

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
	get rect(){ return this.store.rect }
	scale_rect(sx, sy){
		var out = {},
			horiz = [ 'y', 'height', 'top', 'bottom' ];
		
		for(var key in this.store.rect)out[key] = this.store.rect[key] / (horiz.includes(key) ? sy : sx);
		
		return out;
	}
	get in_fov(){
		if(!this.active)return false;
		if(this.cheat.config.aim.fov == 110)return true;
		
		var fov_bak = this.utils.world.camera.fov;
		
		// config fov is percentage of current fov
		this.utils.world.camera.fov = this.cheat.config.aim.fov / fov_bak * 100;
		this.utils.world.camera.updateProjectionMatrix();
		
		this.utils.update_frustum();
		var ret = this.frustum;
		
		this.utils.world.camera.fov = fov_bak;
		this.utils.world.camera.updateProjectionMatrix();
		
		return ret;
	}
	get aim_point(){
		var part = this.cheat.config.aim.offset != 'random' ? this.cheat.config.aim.offset : y_offset_rand;
		
		return this.store.parts[part] || (console.error(part, 'not registered'), { x: 0, y: 0, z: 0 });
	}
	get can_target(){
		return this.active && this.enemy && this.can_see && this.in_fov;
	}
	get frustum(){
		return this.active ? this.utils.contains_point(this) : false;
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
	get box_scale(){
		var view = this.utils.camera_world(),	
			center = this.store.box.getCenter(),
			a = side => Math.min(1, (this.rect[side] / this.utils.canvas[side]) * 10);
		
		return [ a('width'), a('height') ];
	}
	get dist_scale(){
		var view = this.utils.camera_world(),	
			center = this.store.box.getCenter(),
			scale = Math.max(0.65, 1 - this.utils.getD3D(view.x, view.y, view.z, this.x, this.y, this.z) / 600);
		
		return [ scale, scale ];
	}
	get distance_camera(){
		return this.utils.camera_world().distanceTo(this);
	}
	test_vec(vector, match){
		return match.every((value, index) => vector[['x', 'y', 'z'][index]] == value);
	}
	get world_pos(){ return this.store.world_pos }
	get obj(){ return this.is_ai ? target.enity.dat : this.entity[vars.objInstances] }
	get recoil_y(){ return this.entity[vars.recoilAnimY] }
	get has_ammo(){ return this.ammo || this.ammo == this.max_ammo }
	get ammo(){ return this.entity[vars.ammos][this.entity[vars.weaponIndex]] || 0 }
	get max_ammo(){ return this.weapon.ammo || 0 }
	get height(){ return (this.entity.height || 0) - this.entity[vars.crouchVal] * 3 }
	get health(){ return this.entity.health || 0 }
	get scale(){ return this.entity.scale }
	get max_health(){ return this.entity[vars.maxHealth] || 100 }
	//  && (this.is_you ? true : this.chest && this.leg)
	get active(){ return this.entity.active && this.entity.x != null && this.health > 0 && (this.is_you ? true : this.chest && this.leg) }
	get teammate(){ return this.is_you || this.cheat.player && this.team && this.team == this.cheat.player.team }
	get enemy(){ return !this.teammate }
	get team(){ return this.entity.team }
	get auto_weapon(){ return !this.weapon.nAuto }
	get shot(){ return this.auto_weapon ? this.store.shot : this.entity[vars.didShoot] }
	get chest(){
		return this.entity.lowerBody.children[0];
	}
	get leg(){
		for(var mesh of this.entity.legMeshes)if(mesh.visible)return mesh;
		return this.chest;
	}
	tick(){
		var box = this.store.box = new this.utils.three.Box3();
		
		box.expandByObject(this.chest);
		
		var add_obj = obj => {
			if(obj.visible)obj.traverse(obj => {
				if(obj.type == 'Mesh' && obj.visible)box.expandByObject(obj);
			});
		};
		
		
		for(var obj of this.entity.legMeshes)add_obj(obj);
		for(var obj of this.entity.upperBody.children)add_obj(obj);
		
		var bounds = {
			center: this.utils.pos2d(box.getCenter()),
			min: {
				x:  Infinity,
				y: Infinity,
			},
			max: {
				x: -Infinity,
				y: -Infinity,
			},
		};
		
		for(var vec of [
			{ x: box.min.x, y: box.min.y, z: box.min.z },
			{ x: box.min.x, y: box.min.y, z: box.max.z },
			{ x: box.min.x, y: box.max.y, z: box.min.z },
			{ x: box.min.x, y: box.max.y, z: box.max.z },
			{ x: box.max.x, y: box.min.y, z: box.min.z },
			{ x: box.max.x, y: box.min.y, z: box.max.z },
			{ x: box.max.x, y: box.max.y, z: box.min.z },
			{ x: box.max.x, y: box.max.y, z: box.max.z },
		]){
			if(!this.utils.contains_point(vec))continue;
			
			var td  = this.utils.pos2d(vec);
			
			if(td.x < bounds.min.x)bounds.min.x = td.x;
			else if(td.x > bounds.max.x)bounds.max.x = td.x;
			
			if(td.y < bounds.min.y)bounds.min.y = td.y;
			else if(td.y > bounds.max.y)bounds.max.y = td.y;
		}
		
		this.store.rect = {
			x: bounds.center.x,
			y: bounds.center.y,
			left: bounds.min.x,
			top: bounds.min.y,
			right: bounds.max.x,
			bottom: bounds.max.y,
			width: bounds.max.x - bounds.min.x,
			height: bounds.max.y - bounds.min.y,
		};
		
		this.store.parts = {};
		
		var head_size = 1.5,
			chest_box = new this.utils.three.Box3().setFromObject(this.chest),
			chest_size = chest_box.getSize(),
			chest_pos = chest_box.getCenter(),
			// rotated offset
			translate = (obj, input, translate) => {
				for(var axis in translate){
					var ind = ['x','y','z'].indexOf(axis),
						pos = new this.utils.three.Vector3(...[0,0,0].map((x, index) => ind == index ? 1 : 0)).applyQuaternion(obj.getWorldQuaternion()).multiplyScalar(translate[axis]);
					
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
		
		this.store.world_pos = this.active ? this.obj[vars.getWorldPosition]() : { x: 0, y: 0, z: 0 };
		
		this.store.can_see = this.cheat.player && this.active && this.utils.obstructing(this.cheat.player, this.aim_point, this.cheat.player.weapon && this.cheat.player.weapon.pierce && this.cheat.config.aim.wallbangs) == null ? true : false;
	}
	get process_inputs(){
		return this.entity[vars.procInputs];
	}
	set process_inputs(value){
		return this.entity[vars.procInputs] = value;
	}
};

Player.store = Symbol();

module.exports = Player;