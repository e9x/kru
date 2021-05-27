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
	enemy_sight = () => {
		if(cheat.player.shot)return;
		
		var raycaster = new cheat.three.Raycaster();
		
		raycaster.setFromCamera({ x: 0, y: 0 }, cheat.world.camera);
		
		if(cheat.player.aimed && raycaster.intersectObjects(cheat.game.players.list.map(cheat.add).filter(ent => ent.can_target).map(ent => ent.obj), true).length)return true;
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
		
		if(!data.reload && cheat.player.has_ammo && data.shoot && !cheat.player.shot)aim_input(rot, data);
	},
	pdata,
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
	modify = data => {
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
		
		data.could_shoot = cheat.player.can_shoot;
		
		var nauto = cheat.player.weapon_auto || !data.shoot || (!pdata.could_shoot || !pdata.shoot),
			hitchance = (Math.random() * 100) < cheat.config.aim.hitchance,
			can_target = cheat.config.aim.status == 'auto' || data.scope || data.shoot,
			target = cheat.target = can_target && cheat.pick_target();
		
		if(cheat.player.can_shoot)if(cheat.config.aim.status == 'trigger')data.shoot = enemy_sight() || data.shoot;
		else if(cheat.config.aim.status != 'off' && target && cheat.player.health){
			var camera_world = utils.camera_world(),
				x_dire = utils.getXDire(camera_world.x, camera_world.y, camera_world.z, target.aim_point.x, target.aim_point.y - cheat.player.jump_bob_y, target.aim_point.z),
				y_dire = utils.getDir(camera_world.z, camera_world.x, target.aim_point.z, target.aim_point.x),
				rot = {
					x: utils.round(Math.max(-utils.halfpi, Math.min(utils.halfpi, x_dire - (cheat.player.entity.landBobY * 0.1) - cheat.player.recoil_y * 0.27)) % utils.pi2, 3) || 0,
					y: utils.round(y_dire % utils.pi2, 3) || 0,
				};
			
			if(hitchance)if(cheat.config.aim.status == 'correction' && nauto)correct_aim(rot, data);
			else if(cheat.config.aim.status == 'auto'){
				if(cheat.player.can_aim)data.scope = 1;
				
				if(cheat.player.aimed)data.shoot = !cheat.player.shot;
				
				correct_aim(rot, data);
			}
			
			if(cheat.config.aim.status == 'assist' && cheat.player.aim_press){
				if(cheat.config.aim.smooth)rot = smooth({ xD: rot.x, yD: rot.y });
				
				aim_camera(rot, data);
				
				// offset aim rather than revert to any previous camera rotation
				if(data.shoot && !cheat.player.shot && hitchance)data.ydir += 75;
			}
		}
		
		if(cheat.player.can_shoot && data.shoot && !cheat.player.store.shot){
			cheat.player.store.shot = true;
			setTimeout(() => cheat.player.store.shot = false, cheat.player.weapon_rate);
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

pdata = new InputData([]);

module.exports = array => {
	if(cheat.player && cheat.controls)try{
		var data = new InputData(array);
		
		modify(data);
		
		pdata = data;
	}catch(err){
		api.report_error('inputs', err);
	}
	
	return array;
};