'use strict';

exports.main = (cheat, add) => {
	var utils = require('./utils'),
		keys = {frame: 0, delta: 1, xdir: 2, ydir: 3, moveDir: 4, shoot: 5, scope: 6, jump: 7, reload: 8, crouch: 9, weaponScroll: 10, weaponSwap: 11, moveLock: 12},
		round = (n, r) => Math.round(n * Math.pow(10, r)) / Math.pow(10, r),
		dist_center = pos => Math.hypot((window.innerWidth / 2) - pos.x, (window.innerHeight / 2) - pos.y),
		sorts = {
			dist3d: (ent_1, ent_2) => ent_1.distanceTo(ent_2),
			dist2d: (ent_1, ent_2) => dist_center(ent_1.pos2d) - dist_center(ent_2.pos2d),
			hp: (ent_1, ent_2) => ent_1.health - ent_2.health,
		},
		smooth = target	=> {
			var aj = 17,
				// turn = vertical speed 0.0022
				// speed = horizontal speed
				turn = (50 - cheat.config.aim.smooth.value) / 10000,
				speed = (50 - cheat.config.aim.smooth.value) / 10000,
				x_ang = utils.getAngleDst(cheat.controls[cheat.vars.pchObjc].rotation.x, target.xD),
				y_ang = utils.getAngleDst(cheat.controls.object.rotation.y, target.yD);
			
			return {
				y: cheat.controls.object.rotation.y + y_ang * aj * turn,
				x: cheat.controls[cheat.vars.pchObjc].rotation.x + x_ang * aj * turn,
			};
			
			/*
			var z_ang = utils.getD3D(cheat.controls.object.position.x, cheat.controls.object.position.y, cheat.controls.object.position.z, target.x, target.y, target.z) * aj * speed,
				al = utils.getDir(cheat.controls.object.position.z, cheat.controls.object.position.x, target.z, target.x),
				am = utils.getXDire(cheat.controls.object.position.x, cheat.controls.object.position.y, cheat.controls.object.position.z, target.x, target.y, target.z);
			
			cheat.controls.object.position.x -= z_ang * Math.sin(al) * Math.cos(am);
			cheat.controls.object.position.y += z_ang * Math.sin(am);
			cheat.controls.object.position.z -= z_ang * Math.cos(al) * Math.cos(am);
			
			cheat.world.update_frustum();
			*/
		},
		y_offset_types = ['head', 'chest', 'feet'],
		y_offset_rand = 'head',
		enemy_sight = () => {
			if(cheat.player.shot)return;
			
			var raycaster = new cheat.three.Raycaster();
			
			raycaster.setFromCamera({ x: 0, y: 0 }, cheat.world.camera);
			
			if(cheat.player.aim && raycaster.intersectObjects(cheat.players.filter(ent => ent.target).map(ent => ent.obj), true).length)return true;
		},
		aim_input = (rot, data) => {
			data[keys.xdir] = rot.x * 1000;
			data[keys.ydir] = rot.y * 1000;
		},
		aim_camera = rot => {
			cheat.controls[cheat.vars.pchObjc].rotation.x = rot.x;
			cheat.controls.object.rotation.y = rot.y;
		};
	
	setInterval(() => y_offset_rand = y_offset_types[~~(Math.random() * y_offset_types.length)], 2000);
	
	exports.exec = data => {
		var target = cheat.target = (cheat.target.target ? cheat.target : cheat.players.filter(player => player.target).sort((ent_1, ent_2) => sorts[cheat.config.aim.target_sorting || 'dist2d'](ent_1, ent_2) * (ent_1.frustum ? 1 : 0.5))[0]) || {},
			can_shoot = !data[keys.reloading] && cheat.player.has_ammo;
		
		// bhop
		if(cheat.config.game.bhop != 'off' && (cheat.UI.inputs.Space || cheat.config.game.bhop == 'autojump' || cheat.config.game.bhop == 'autoslide')){
			cheat.controls.keys[cheat.controls.binds.jump.val] ^= 1;
			if(cheat.controls.keys[cheat.controls.binds.jump.val])cheat.controls.didPressed[cheat.controls.binds.jump.val] = 1;
			
			if((document.activeElement.nodeName != 'INPUT' && cheat.config.game.bhop == 'keyslide' && cheat.UI.inputs.Space || cheat.config.game.bhop == 'autoslide') && cheat.player.y_vel < -0.02 && cheat.player.can_slide)setTimeout(() => cheat.controls.keys[cheat.controls.binds.crouch.val] = 0, 325), cheat.controls.keys[cheat.controls.binds.crouch.val] = 1;
			// ;
		}
		
		if(!cheat.player.has_ammo && (cheat.config.aim.status == 'auto' || cheat.config.aim.auto_reload))data[keys.reload] = 1;
		
		if(can_shoot && cheat.config.aim.status == 'trigger')data[keys.shoot] = +enemy_sight() || data[keys.shoot];
		else if(can_shoot && cheat.config.aim.status != 'off' && target.active && cheat.player.health){
			var y_val = target.y + (target[cheat.syms.isAI] ? -(target.dat.mSize / 2) : (target.jump_bob_y * 0.072) + 1 - target.crouch * 3);
			
			switch(cheat.config.aim.offset != 'random' ? cheat.config.aim.offset : y_offset_rand){
				case'chest':
					y_val -= target.height / 2;
					break;
				case'feet':
					y_val -= target.height - target.height / 2.5;
					break;
			};
			
			var y_dire = utils.getDir(cheat.player.z, cheat.player.x, target.z, target.x),
				x_dire = utils.getXDire(cheat.player.x, cheat.player.y, cheat.player.z, target.x, y_val, target.z),
				rot = {
					x: round(Math.max(-utils.halfpi, Math.min(utils.halfpi, x_dire - cheat.player.recoil_y * 0.27)) % utils.pi2, 3) || 0,
					y: utils.normal_radian(round(y_dire % utils.pi2, 3)) || 0,
				};
			
			if(cheat.config.aim.status == 'correction' && data[keys.shoot] && !cheat.player.shot)aim_input(rot, data);
			if(cheat.config.aim.status == 'auto'){
				data[keys.scope] = 1;
				
				if(cheat.config.aim.smooth.status){
					rot = smooth({ xD: rot.x, yD: rot.y });
					data[keys.shoot] = +enemy_sight();
					aim_camera(rot);
					aim_input(rot, data);
				}else{
					if(cheat.player.aim)data[keys.shoot] = cheat.player.shot ? 0 : 1;
					aim_input(rot, data);
				}
			}else if(cheat.config.aim.status == 'assist' && cheat.player.aim_press){
				if(cheat.config.aim.smooth.status)rot = smooth({ xD: rot.x, yD: rot.y });
				
				aim_camera(rot);
				aim_input(rot, data);
				
				if(!cheat.player.shot && (Math.random() * 100) > cheat.config.aim.hitchance)data[keys.ydir] += 75;
			}
		}
		
		if(data[keys.shoot] && !cheat.player.entity[cheat.syms.shot]){
			cheat.player.entity[cheat.syms.shot] = true;
			setTimeout(() => cheat.player.entity[cheat.syms.shot] = false, cheat.player.weapon.rate);
		}
	}
};