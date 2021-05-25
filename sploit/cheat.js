'use strict';
var API = require('./libs/api'),
	{ mm_url, api_url, utils } = require('./consts'),
	api = new API(mm_url, api_url),
	vars = require('./libs/vars'),
	inputs = require('./input'),
	visual = require('./visual');

exports.add = entity => new Player(entity),

exports.hooked = Symbol();
exports.shot = Symbol();
exports.store = Symbol();

exports.config = {};

exports.draw_box = () => exports.config.esp.status == 'box' || exports.config.esp.status == 'box_chams' || exports.config.esp.status == 'full';
exports.draw_chams = () => exports.config.esp.status == 'chams' || exports.config.esp.status == 'box_chams' || exports.config.esp.status == 'full';

exports.skins = [...Array(5000)].map((e, i) => ({ ind: i, cnt: 1 }));

exports.update_frustum = () => {
	exports.world.frustum.setFromProjectionMatrix(new exports.three.Matrix4().multiplyMatrices(exports.world.camera.projectionMatrix, exports.world.camera.matrixWorldInverse));
};

exports.reload = () => {
	delete require.cache[require.resolve('./input')];
	delete require.cache[require.resolve('./visual')];
	inputs = require('./input');
	visual = require('./visual');
};

exports.process = () => {
	try{
		if(exports.game && exports.world){
			for(var ent of exports.game.players.list){
				let player = exports.add(ent);
				
				if(!player.active)continue;
				
				if(player.is_you)exports.player = player;
				
				player.tick();
				
				if(exports.controls && exports.controls[vars.tmpInpts] && !exports.controls[vars.tmpInpts][exports.hooked]){
					exports.controls[vars.tmpInpts][exports.hooked] = true;
					
					var push = exports.controls[vars.tmpInpts].push;
					
					exports.controls[vars.tmpInpts].push = function(data){
						if(exports.player && exports.player.weapon)try{
							inputs(data);
						}catch(err){
							api.report_error('inputs', err);
						}
						return push.call(this, data);
					}
				}
			}
		};
		
		visual();
	}catch(err){
		api.report_error('frame', err);
	}
	
	requestAnimationFrame(exports.process);
};

exports.socket_id = 0;

exports.sorts = {
	dist3d(ent_1, ent_2){
		return ent_1.distance_camera() - ent_2.distance_camera();
	},
	dist2d(ent_1, ent_2){
		return utils.dist_center(ent_1.rect()) - utils.dist_center(ent_2.rect());
	},
	hp(ent_1, ent_2){
		return ent_1.health - ent_2.health;
	},
};

exports.pick_target = () => exports.game.players.list.map(exports.add).filter(player => player.can_target).sort((ent_1, ent_2) => exports.sorts[exports.config.aim.target_sorting || 'dist2d'](ent_1, ent_2) * (ent_1.frustum ? 1 : 0.5))[0];

class Player {
	constructor(entity){
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
	get store(){ return this.entity[exports.store] || (this.entity[exports.store] = {}) }
	get can_see(){ return this.store.can_see }
	get in_fov(){
		if(!this.active)return false;
		if(exports.config.aim.fov == 110)return true;
		
		var fov_bak = exports.world.camera.fov;
		
		// config fov is percentage of current fov
		exports.world.camera.fov = exports.config.aim.fov / fov_bak * 100;
		exports.world.camera.updateProjectionMatrix();
		
		exports.update_frustum();
		var ret = this.frustum;
		
		exports.world.camera.fov = fov_bak;
		exports.world.camera.updateProjectionMatrix();
		
		return ret;
	}
	get can_target(){
		return this.active && this.enemy && this.can_see && this.in_fov;
	}
	get frustum(){
		return this.active ? exports.contains_point(this) : false;
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
	get aim(){ return this.weapon.noAim || !this.aim_val || exports.target && exports.target.active && this.weapon.melee && this.distance_to(exports.target) <= 18 }
	get aim_press(){ return exports.controls[vars.mouseDownR] || exports.controls.keys[exports.controls.binds.aim.val] }
	get crouch(){ return this.entity[vars.crouchVal] }
	// buggy
	bounds(){
		return {
			min: utils.pos2d(this.store.box.min),
			max: utils.pos2d(this.store.box.max),
		};
	}
	rect(){
		// hitbox rect, add a accurate player rect similar to junker
		var src_pos = utils.pos2d(this),
			src_pos_crouch = utils.pos2d(this, this.height),
			width = ~~((src_pos.y - utils.pos2d(this, this.entity.height).y) * 0.7),
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
		return exports.world.camera[vars.getWorldPosition]().distanceTo(this);
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
	get teammate(){ return this.is_you || exports.player && this.team && this.team == exports.player.team }
	get enemy(){ return !this.teammate }
	get team(){ return this.entity.team }
	get auto_weapon(){ return !this.weapon.nAuto }
	get shot(){ return this.auto_weapon ? this.entity[exports.shot] : this.entity[vars.didShoot] }
	get chest(){
		return this.obj && this.obj.children[0] && this.obj.children[0].children[4] && this.obj.children[0].children[4].children[0];
		
		var found;
		// console.log(this.chest.parent.position, this.leg.scale);
		if(this.obj)this.obj.traverse(obj => {
			if(exports.test_vec(obj.parent.position, [ 0, 4.2, 0 ]) && exports.test_vec(obj.scale, [ 1, 1, 1 ]))found = obj;
		});
		
		return found;
	}
	get leg(){
		return this.obj && this.obj.children[0] && this.obj.children[0].children[0];
		
		var found;
		
		if(this.obj)this.obj.traverse(obj => {
			if(exports.test_vec(obj.scale, [ 1.3, 4.2, 1.3 ]))found = obj;
		});
		
		return found;
	}
	tick(){
		/*this.store.box = new exports.three.Box3();
		
		if(this.active)this.obj.traverse(obj => {
			if(obj.visible && obj.type == 'Mesh')this.store.box.expandByObject(this.obj);;
		});*/
		
		this.store.can_see = exports.player && this.active && utils.obstructing(exports.player, this, exports.player.weapon && exports.player.weapon.pierce && exports.config.aim.wallbangs) == null ? true : false;
		
		this.store.parts = {
			torso: { x: 0, y: 0, z: 0 },
			head: { x: 0, y: 0, z: 0 },
			legs: { x: 0, y: 0, z: 0 },
		};
		
		// config.js
		var head_size = 1.5;
		
		if(this.active && !this.is_you && this.chest && this.leg){
			var chest_box = new exports.three.Box3().setFromObject(this.chest),
				chest_size = chest_box.getSize(),
				chest_pos = chest_box.getCenter(),
				// rotated offset
				translate = (obj, input, translate) => {
					for(var axis in translate){
						var ind = ['x','y','z'].indexOf(axis),
							pos = new exports.three.Vector3(...[0,0,0].map((x, index) => ind == index ? 1 : 0)).applyQuaternion(obj.getWorldQuaternion()).multiplyScalar(translate[axis]);
						
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

exports.camera_world = () => {
	var matrix_copy = exports.world.camera.matrixWorld.clone(),
		pos = exports.world.camera[vars.getWorldPosition]();
	
	exports.world.camera.matrixWorld.copy(matrix_copy);
	exports.world.camera.matrixWorldInverse.copy(matrix_copy).invert();
	
	return pos.clone();
};

exports.contains_point = point => {
	for(var ind = 0; ind < 6; ind++)if(exports.world.frustum.planes[ind].distanceToPoint(point) < 0)return false;
	return true;
};

exports.test_vec = (vector, match) => match.every((value, index) => vector[['x', 'y', 'z'][index]] == value);