'use strict';

exports.main = (cheat, add) => {
	var util = require('./util'),
		three = require('three'),
		keys = {frame: 0, delta: 1, xdir: 2, ydir: 3, moveDir: 4, shoot: 5, scope: 6, jump: 7, reload: 8, crouch: 9, weaponScroll: 10, weaponSwap: 11, moveLock: 12},
		round = (n, r) => Math.round(n * Math.pow(10, r)) / Math.pow(10, r),
		raycaster = new three.Raycaster(),
		dist_center = pos => Math.hypot((window.innerWidth / 2) - pos.x, (window.innerHeight / 2) - pos.y),
		sorts = {
			dist3d: (ent_1, ent_2) => add(ent_1).distanceTo(ent_2),
			dist2d: (ent_1, ent_2) => dist_center(add(ent_2).pos2d) - dist_center(add(ent_1).pos2d),
			hp: (ent_1, ent_2) => ent_1.health - ent_2.health,
		},
		smooth = target	=> {
			var aj = 17,
				// turn = vertical speed 0.0022
				// speed = horizontal speed
				turn = (50 - cheat.config.aim.smooth.value) / 10000,
				speed = (50 - cheat.config.aim.smooth.value) / 10000,
				ang = util.getAngleDst(cheat.controls.object.rotation.y, target.yD);
			
			cheat.controls.object.rotation.y += ang * aj * turn, ang = util.getAngleDst(cheat.controls[cheat.vars.pchObjc].rotation.x, target.xD), 
			
			cheat.controls[cheat.vars.pchObjc].rotation.x += ang * aj * turn, ang = util.getD3D(cheat.controls.object.position.x, cheat.controls.object.position.y, cheat.controls.object.position.z, target.x, target.y, target.z) * aj * speed;
			
			var al = util.getDir(cheat.controls.object.position.z, cheat.controls.object.position.x, target.z, target.x),
				am = util.getXDire(cheat.controls.object.position.x, cheat.controls.object.position.y, cheat.controls.object.position.z, target.x, target.y, target.z);
			
			cheat.controls.object.position.x -= ang * Math.sin(al) * Math.cos(am), cheat.controls.object.position.y += ang * Math.sin(am), 
			cheat.controls.object.position.z -= ang * Math.cos(al) * Math.cos(am), cheat.world.updateFrustum();
		},
		y_offset_types = ['head', 'chest', 'feet'],
		y_offset_rand = 'head';
	
	setInterval(() => y_offset_rand = y_offset_types[~~(Math.random() * y_offset_types.length)], 2000);
	
	exports.exec = data => {
		var target = cheat.target = add(cheat.target).target ? cheat.target : cheat.game.players.list.filter(player => add(player).target).sort((ent_1, ent_2) => sorts[cheat.config.aim.target_sorting || 'dist2d'](ent_1, ent_2) * (add(ent_1).frustum == add(ent_2).frustum ? 1 : 0.5))[0],
			has_ammo = add(cheat.player).weapon.melee || cheat.player[cheat.vars.ammos][cheat.player[cheat.vars.weaponIndex]];
		
		// bhop
		if(cheat.config.game.bhop != 'off' && (cheat.ui.inputs.Space || cheat.config.game.bhop == 'autojump' || cheat.config.game.bhop == 'autoslide')){
			cheat.controls.keys[cheat.controls.binds.jump.val] ^= 1;
			if(cheat.controls.keys[cheat.controls.binds.jump.val])cheat.controls.didPressed[cheat.controls.binds.jump.val] = 1;
			
			if((parent.document.activeElement.nodeName != 'INPUT' && cheat.config.game.bhop == 'keyslide' && cheat.ui.inputs.Space || cheat.config.game.bhop == 'autoslide') && cheat.player[cheat.vars.yVel] < -0.02 && cheat.player.canSlide){
				setTimeout(() => cheat.controls.keys[cheat.controls.binds.crouch.val] = 0, 325);
				cheat.controls.keys[cheat.controls.binds.crouch.val] = 1;
			}
		}
		
		// auto reload, currentAmmo set earlier
		if(cheat.player && !has_ammo && (cheat.config.aim.status == 'silent' || cheat.config.aim.auto_reload))data[keys.reload] = 1;
		
		raycaster.setFromCamera({ x: 0, y: 0 }, cheat.world.camera);
		
		// data[keys.reload]
		if(has_ammo && cheat.config.aim.status != 'off' && target && cheat.player.health){
			var yVal = target.y + (target[cheat.syms.isAI] ? -(target.dat.mSize / 2) : (target.jumpBobY * 0.072) + 1 - add(target).crouch * 3);
			
			switch(cheat.config.aim.offset != 'random' ? cheat.config.aim.offset : y_offset_rand){
				case'chest':
					
					yVal -= target.height / 2;
					
					break;
				case'feet':
					
					yVal -= target.height - target.height / 2.5;
					
					break;
			};
			
			var yDire = util.getDir(add(cheat.player).z, add(cheat.player).x, target.z, target.x),
				xDire = util.getXDire(add(cheat.player).x, add(cheat.player).y, add(cheat.player).z, target.x, yVal, target.z),
				xv = xDire - add(cheat.player).recoil_y * 0.27,
				rot = {
					x: round(Math.max(-util.halfpi, Math.min(util.halfpi, xv )) % util.pi2, 3) || 0,
					y: util.normal_radian(round(yDire % util.pi2, 3)) || 0,
				};
			
			// triggerbot
			if((cheat.config.aim.status == 'silent' && !cheat.config.aim.smooth.status || ['silent', 'triggerbot'].includes(cheat.config.aim.status) && add(cheat.player).aim && raycaster.intersectObjects(cheat.game.players.list.filter(ent => add(ent).active && add(ent).enemy && add(ent).can_see).map(ent => add(ent).obj), true).length) && add(cheat.player).aim)data[keys.shoot] = add(cheat.player).shot ? 0 : 1;
			
			// if fully aimed or weapon cant even be aimed or weapon is melee and nearby, shoot
			if(cheat.config.aim.status == 'silent' && !cheat.config.aim.smooth.status && add(cheat.player).aim)data[keys.shoot] = add(cheat.player).shot ? 0 : 1;
			
			var do_aim = cheat.config.aim.status == 'silent' || cheat.config.aim.status == 'assist' && add(cheat.player).aim_press;
			
			if(cheat.config.aim.status == 'hidden'){
				// wip
				
				if(add(cheat.player).shot && add(cheat.player).aim){
					data[keys.xdir] = rot.x * 1000;
					data[keys.ydir] = rot.y * 1000;
					
					cheat.weapon_aimed = true;
					
					setTimeout(() => cheat.weapon_aimed = false, cheat.player.weapon.rate);
				}
			}else if(do_aim)switch(cheat.config.aim.status){
				case'assist':
					
					if(cheat.config.aim.smooth.status)smooth({
						xD: rot.x,
						yD: rot.y,
					}); else {
						cheat.controls[cheat.vars.pchObjc].rotation.x = rot.x;
						cheat.controls.object.rotation.y = rot.y;
						
						data[keys.xdir] = rot.x * 1000;
						data[keys.ydir] = rot.y * 1000;
					}
					
					break
				case'silent':
					
					data[keys.scope] = 1;
					
					if(cheat.config.aim.smooth.status)smooth({ xD: rot.x, yD: rot.y });
					else {
						data[keys.xdir] = rot.x * 1000;
						data[keys.ydir] = rot.y * 1000;
					}
					
					break
			}else cheat.target = null;
		}
	};
};