'use strict';
var vars = require('./libs/vars'),
	integrate = require('./libs/integrate'),
	Player = require('./libs/player'),
	{ cheat, api, utils } = require('./consts');

class InputData {
	constructor(array){
		this.array = array;
	}
};

InputData.previous = {};

for(let prop in vars.keys){
	let key = vars.keys[prop];
	
	Object.defineProperty(InputData.prototype, prop, {
		get(){
			return this.array[key];
		},
		set(value){
			return this.array[key] = typeof value == 'boolean' ? +value : value;
		},
	});
}

class Input {
	push(array){
		if(cheat.player && cheat.controls)try{
			var data = new InputData(array);
			
			this.modify(data);
			
			InputData.previous = data;
		}catch(err){
			api.report_error('input', err);
		}
		
		return array;
	}
	aim_input(rot, data){
		data.xdir = rot.x * 1000;
		data.ydir = rot.y * 1000;
	}
	aim_camera(rot, data){
		// updating camera will make a difference next tick, update current tick with aim_input
		cheat.controls[vars.pchObjc].rotation.x = rot.x;
		cheat.controls.object.rotation.y = rot.y;
		
		this.aim_input(rot, data);
	}
	correct_aim(rot, data){
		if(data.shoot)data.shoot = !cheat.player.shot;
		
		if(!data.reload && cheat.player.has_ammo && data.shoot && !cheat.player.shot)this.aim_input(rot, data);
	}
	enemy_sight(){
		if(cheat.player.shot)return;
		
		var raycaster = new cheat.three.Raycaster();
		
		raycaster.setFromCamera({ x: 0, y: 0 }, cheat.world.camera);
		
		if(cheat.player.aimed && raycaster.intersectObjects(cheat.game.players.list.map(cheat.add).filter(ent => ent.can_target).map(ent => ent.obj), true).length)return true;
	}
	calc_rot(target){
		var camera_world = utils.camera_world(),
			x_dire = utils.getXDire(camera_world.x, camera_world.y, camera_world.z, target.aim_point.x, target.aim_point.y - cheat.player.jump_bob_y, target.aim_point.z),
			y_dire = utils.getDir(camera_world.z, camera_world.x, target.aim_point.z, target.aim_point.x);
		
		return {
			x: utils.round(Math.max(-utils.halfpi, Math.min(utils.halfpi, x_dire - (cheat.player.entity.landBobY * 0.1) - cheat.player.recoil_y * 0.27)) % utils.pi2, 3) || 0,
			y: utils.round(y_dire % utils.pi2, 3) || 0,
		};
	}
	smooth(target){
		var mov = 17,
			// default 0.0022
			div = 10000,
			turn = (50 - cheat.config.aim.smooth) / div,
			speed = (50 - cheat.config.aim.smooth) / div,
			x_ang = utils.getAngleDst(cheat.controls[vars.pchObjc].rotation.x, target.xD),
			y_ang = utils.getAngleDst(cheat.controls.object.rotation.y, target.yD);
		
		return {
			y: cheat.controls.object.rotation.y + y_ang * mov * turn,
			x: cheat.controls[vars.pchObjc].rotation.x + x_ang * mov * turn,
		};
	}
	modify(data){
		// bhop
		if(integrate.focused && cheat.config.game.bhop != 'off' && (integrate.inputs.Space || cheat.config.game.bhop == 'autojump' || cheat.config.game.bhop == 'autoslide')){
			cheat.controls.keys[cheat.controls.binds.jump.val] ^= 1;
			if(cheat.controls.keys[cheat.controls.binds.jump.val])cheat.controls.didPressed[cheat.controls.binds.jump.val] = 1;
			
			if((cheat.config.game.bhop == 'keyslide' && integrate.inputs.Space || cheat.config.game.bhop == 'autoslide') && cheat.player.y_vel < -0.02 && cheat.player.can_slide)setTimeout(() => cheat.controls.keys[cheat.controls.binds.crouch.val] = 0, 325), cheat.controls.keys[cheat.controls.binds.crouch.val] = 1;
		}
		
		// auto reload
		if(!cheat.player.has_ammo && (cheat.config.aim.status == 'auto' || cheat.config.aim.auto_reload))data.reload = 1;
		
		// TODO: target once on aim
		
		data.could_shoot = cheat.player.can_shoot;
		
		var nauto = cheat.player.weapon_auto || !data.shoot || (!InputData.previous.could_shoot || !InputData.previous.shoot),
			hitchance = (Math.random() * 100) < cheat.config.aim.hitchance,
			can_target = cheat.config.aim.status == 'auto' || data.scope || data.shoot;
		
		if(can_target)cheat.target = cheat.pick_target();
		
		if(cheat.player.can_shoot)if(cheat.config.aim.status == 'trigger')data.shoot = this.enemy_sight() || data.shoot;
		else if(cheat.config.aim.status != 'off' && cheat.target && cheat.player.health){
			var rot = this.calc_rot(cheat.target);
			
			if(hitchance)if(cheat.config.aim.status == 'correction' && nauto)this.correct_aim(rot, data);
			else if(cheat.config.aim.status == 'auto'){
				if(cheat.player.can_aim)data.scope = 1;
				
				if(cheat.player.aimed)data.shoot = !cheat.player.shot;
				
				this.correct_aim(rot, data);
			}
			
			if(cheat.config.aim.status == 'assist' && cheat.player.aim_press){
				if(cheat.config.aim.smooth)rot = this.smooth({ xD: rot.x, yD: rot.y });
				
				this.aim_camera(rot, data);
				
				// offset aim rather than revert to any previous camera rotation
				// if(data.shoot && !cheat.player.shot && hitchance)data.ydir += 75;
			}
		}
		
		if(cheat.player.can_shoot && data.shoot && !cheat.player.auto_shot){
			cheat.player.auto_shot = true;
			setTimeout(() => cheat.player.auto_shot = false, cheat.player.weapon_rate);
		}
	}
};

module.exports = Input;