'use strict';
var cheat = require('./cheat'),
	vars = require('./libs/vars'),
	integrate = require('./libs/integrate'),
	Player = require('./libs/player'),
	{ api, utils } = require('./consts'),
	smooth = target	=> {
		var aj = 17,
			// default 0.0022
			div = 10000,
			turn = (50 - cheat.config.aim.smooth) / div,
			speed = (50 - cheat.config.aim.smooth) / div,
			x_ang = utils.getAngleDst(cheat.controls[vars.pchObjc].rotation.x, target.xD),
			y_ang = utils.getAngleDst(cheat.controls.object.rotation.y, target.yD);
		
		return {
			y: cheat.controls.object.rotation.y + y_ang * aj * turn,
			x: cheat.controls[vars.pchObjc].rotation.x + x_ang * aj * turn,
		};
	},
	y_offset_types = ['head', 'torso', 'legs'],
	y_offset_rand = 'head',
	enemy_sight = () => {
		if(cheat.player.shot)return;
		
		var raycaster = new cheat.three.Raycaster();
		
		raycaster.setFromCamera({ x: 0, y: 0 }, cheat.world.camera);
		
		if(cheat.player.aim && raycaster.intersectObjects(cheat.game.players.list.map(cheat.add).filter(ent => ent.can_target).map(ent => ent.obj), true).length)return true;
	},
	aim_input = (rot, data) => {
		data.xdir = rot.x * 1000;
		data.ydir = rot.y * 1000;
	},
	aim_camera = (rot, data) => {
		// updating camera will make a difference next tick, update current tick with aim_input
		cheat.controls[vars.pchObjc].rotation.x = rot.x;
		cheat.controls.object.rotation.y = rot.y;
		
		aim_input(rot, data);
	},
	correct_aim = (rot, data) => {
		if(data.shoot)data.shoot = !cheat.player.shot;
		
		if(data.shoot && !cheat.player.shot)aim_input(rot, data);
	},
	/*
	[
		controls.getISN(),
		Math.round(delta * game.config.deltaMlt),
		Math.round(1000 * controls.yDr.round(3)),
		Math.round(1000 * xDr.round(3)),
		game.moveLock ? -1 : config.movDirs.indexOf(controls.moveDir),
		controls.mouseDownL || controls.keys[controls.binds.shoot.val] ? 1 : 0,
		controls.mouseDownR || controls.keys[controls.binds.aim.val] ? 1 : 0,
		!Q.moveLock && controls.keys[controls.binds.jump.val] ? 1 : 0,
		controls.keys[controls.binds.reload.val] ? 1 : 0,
		controls.keys[controls.binds.crouch.val] ? 1 : 0,
		controls.scrollToSwap ? controls.scrollDelta * ue.tmp.scrollDir : 0,
		controls.wSwap,
		1 - controls.speedLmt.round(1),
		controls.keys[controls.binds.reset.val] ? 1 : 0,
		controls.keys[controls.binds.interact.val] ? 1 : 0
	];
	*/
	keys = { frame: 0, delta: 1, xdir: 2, ydir: 3, moveDir: 4, shoot: 5, scope: 6, jump: 7, reload: 8, crouch: 9, weaponScroll: 10, weaponSwap: 11, moveLock: 12, speed_limit: 13, reset: 14, interact: 15 },
	modify = modify = array => {
		var data = new InputData(array);
		
		// bhop
		if(integrate.focused && cheat.config.game.bhop != 'off' && (integrate.inputs.Space || cheat.config.game.bhop == 'autojump' || cheat.config.game.bhop == 'autoslide')){
			cheat.controls.keys[cheat.controls.binds.jump.val] ^= 1;
			if(cheat.controls.keys[cheat.controls.binds.jump.val])cheat.controls.didPressed[cheat.controls.binds.jump.val] = 1;
			
			if((cheat.config.game.bhop == 'keyslide' && integrate.inputs.Space || cheat.config.game.bhop == 'autoslide') && cheat.player.y_vel < -0.02 && cheat.player.can_slide)setTimeout(() => cheat.controls.keys[cheat.controls.binds.crouch.val] = 0, 325), cheat.controls.keys[cheat.controls.binds.crouch.val] = 1;
		}
		
		// auto reload
		if(!cheat.player.has_ammo && (cheat.config.aim.status == 'auto' || cheat.config.aim.auto_reload))data.reload = 1;
		
		// TODO: target once on aim
		
		// aimbot
		
		var can_hit = (Math.random() * 100) < cheat.config.aim.hitchance,
			can_shoot = !data.reloading && cheat.player.has_ammo,
			target = cheat.target = cheat.config.aim.status != 'auto' && !data.scope && !data.shoot
			? null
			: cheat.target && cheat.target.can_target
				? cheat.target
				: cheat.pick_target();
		
		/*
		y_val = target.world_pos.y + (target.is_ai ? -(target.enity.dat.mSize / 2) : (target.jump_bob_y * 0.072) + 1 - target.crouch * 3);
			
			switch(cheat.config.aim.offset != 'random' ? cheat.config.aim.offset : y_offset_rand){
				case'chest':
					y_val -= target.height / 2;
					break;
				case'feet':
					y_val -= target.height - target.height / 2.5;
					break;
			};
		*/
		
		// todo: triggerbot delay
		if(can_shoot && cheat.config.aim.status == 'trigger')data.shoot = enemy_sight() || data.shoot;
		else if(can_shoot && cheat.config.aim.status != 'off' && target && cheat.player.health){
			var camera_world = utils.camera_world(),
				part = cheat.config.aim.offset != 'random' ? cheat.config.aim.offset : y_offset_rand,
				target_pos = target.parts[part] || (console.error(part, 'not registered'), { x: 0, y: 0, z: 0 }),
				x_dire = utils.getXDire(camera_world.x, camera_world.y, camera_world.z, target_pos.x, target_pos.y - cheat.player.jump_bob_y, target_pos.z),
				y_dire = utils.getDir(camera_world.z, camera_world.x, target_pos.z, target_pos.x),
				rot = {
					x: utils.round(Math.max(-utils.halfpi, Math.min(utils.halfpi, x_dire - (cheat.player.entity.landBobY * 0.1) - cheat.player.recoil_y * 0.27)) % utils.pi2, 3) || 0,
					y: utils.normal_radian(utils.round(y_dire % utils.pi2, 3)) || 0,
				};
			
			if(can_hit){
				if(cheat.config.aim.status == 'correction')correct_aim(rot, data);
				else if(cheat.config.aim.status == 'auto'){
					data.scope = 1;
					
					if(cheat.player.aim)data.shoot = cheat.player.shot ? 0 : 1;
					correct_aim(rot, data);
				}
			}
			
			if(cheat.config.aim.status == 'assist' && cheat.player.aim_press){
				if(cheat.config.aim.smooth)rot = smooth({ xD: rot.x, yD: rot.y });
				
				aim_camera(rot, data);
				
				// offset aim rather than revert to any previous camera rotation
				if(data.shoot && !cheat.player.shot && !can_hit)data.ydir += 75;
			}
		}
		
		if(data.shoot && cheat.player.auto_weapon && !cheat.player.store.shot){
			cheat.player.store.shot = true;
			setTimeout(() => cheat.player.store.shot = false, cheat.player.weapon.rate + 25);
		}
	};

class InputData {
	constructor(array){
		this.array = array;
	}
}

for(let key in keys)Object.defineProperty(InputData.prototype, key, {
	get(){
		return this.array[keys[key]];
	},
	set(value){
		return this.array[keys[key]] = typeof value == 'boolean' ? +value : value;
	},
});

setInterval(() => y_offset_rand = y_offset_types[~~(Math.random() * y_offset_types.length)], 2000);

module.exports = array => {
	if(cheat.player && cheat.controls)try{
		modify(array);
	}catch(err){
		api.report_error(err);
	}
	
	return array;
};