var keys = {frame: 0, delta: 1, xdir: 2, ydir: 3, moveDir: 4, shoot: 5, scope: 6, jump: 7, reload: 8, crouch: 9, weaponScroll: 10, weaponSwap: 11, moveLock: 12},
	smooth = (cheat, target) => {
		var aj = 17,
			turn = 0.0022,
			speed = (50 - cheat.config.aim.smooth.value) / 5000,
			ang = cheat.util.getAngleDst(cheat.controls.object.rotation.y, target.yD);
		
		cheat.controls.object.rotation.y += ang * aj * turn, ang = cheat.util.getAngleDst(cheat.controls[cheat.vars.pchObjc].rotation.x, target.xD), 
		
		cheat.controls[cheat.vars.pchObjc].rotation.x += ang * aj * turn, ang = cheat.util.getD3D(cheat.controls.object.position.x, cheat.controls.object.position.y, cheat.controls.object.position.z, target.x, target.y, target.z) * aj * speed;
		
		var al = cheat.util.getDir(cheat.controls.object.position.z, cheat.controls.object.position.x, target.z, target.x),
			am = cheat.util.getXDire(cheat.controls.object.position.x, cheat.controls.object.position.y, cheat.controls.object.position.z, target.x, target.y, target.z);
		
		cheat.controls.object.position.x -= ang * Math.sin(al) * Math.cos(am), cheat.controls.object.position.y += ang * Math.sin(am), 
		cheat.controls.object.position.z -= ang * Math.cos(al) * Math.cos(am), cheat.world.updateFrustum();
	};

module.exports = (cheat, add, data) => {
	var target = cheat.target = cheat.game.players.list.filter(ent => ent[add] && !ent[add].is_you && ent[add].canSee && ent[add].active && ent[add].enemy && (cheat.config.aim.sight ? ent[add].frustum : true)).sort(cheat.sorts.norm)[0],
		pm = cheat.game.players.list.filter(ent => ent && ent[add] && ent[add].active && ent[add].enemy && ent[add].canSee).map(ent => ent[add].obj),
		has_ammo = cheat.player[add].weapon.melee || cheat.player[cheat.vars.ammos][cheat.player[cheat.vars.weaponIndex]];
	
	// arrow controls
	cheat.controls[cheat.vars.pchObjc].rotation.x -= cheat.ui.inputs.ArrowDown ? 0.006 : 0;
	cheat.controls[cheat.vars.pchObjc].rotation.x += cheat.ui.inputs.ArrowUp ? 0.006 : 0;
	
	cheat.controls.object.rotation.y -= cheat.ui.inputs.ArrowRight ? 0.00675 : 0;
	cheat.controls.object.rotation.y += cheat.ui.inputs.ArrowLeft ? 0.00675 : 0;
	
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
	
	cheat.raycaster.setFromCamera({ x: 0, y: 0 }, cheat.world.camera);
	
	// data[keys.reload]
	if(has_ammo && cheat.config.aim.status != 'off' && target && cheat.player.health){
		var yVal = target.y + (target[cheat.syms.isAI] ? -(target.dat.mSize / 2) : (target.jumpBobY * 0.072) + 1 - target[add].crouch * 3),
			yDire = cheat.util.getDir(cheat.player[add].pos.z, cheat.player[add].pos.x, target.z, target.x),
			xDire = cheat.util.getXDire(cheat.player[add].pos.x, cheat.player[add].pos.y, cheat.player[add].pos.z, target.x, yVal, target.z),
			xv = xDire - cheat.player[cheat.vars.recoilAnimY] * 0.27,
			rot = {
				x: cheat.round(Math.max(-cheat.util.halfpi, Math.min(cheat.util.halfpi, xv )) % cheat.util.pi2, 3) || 0,
				y: cheat.util.normal_radian(cheat.round(yDire % cheat.util.pi2, 3)) || 0,
			};
		
		if((cheat.config.aim.status == 'silent' && !cheat.config.aim.smooth.status || ['silent', 'triggerbot'].includes(cheat.config.aim.status) && cheat.player[add].aim && cheat.raycaster.intersectObjects(pm, true).length) && cheat.player[add].aim)data[keys.shoot] = cheat.player[add].shot ? 0 : 1;
		
		// if fully aimed or weapon cant even be aimed or weapon is melee and nearby, shoot
		if(cheat.config.aim.status == 'silent' && !cheat.config.aim.smooth.status && cheat.player[add].aim)data[keys.shoot] = cheat.player[add].shot ? 0 : 1;

		var do_aim = cheat.config.aim.status == 'silent' || cheat.config.aim.status == 'assist' && cheat.player[add].aim_press;
		
		switch(cheat.config.aim.status){
			case'hidden':
				
				// wip
				
				if(cheat.player[add].shot && cheat.player[add].aim){
					data[keys.xdir] = rot.x * 1000;
					data[keys.ydir] = rot.y * 1000;
					
					cheat.weapon_aimed = true;
					
					setTimeout(() => cheat.weapon_aimed = false, cheat.player.weapon.rate);
				}
				
				break;
			case'assist':
				
				if(do_aim && cheat.config.aim.smooth.status)smooth(cheat, {
					xD: rot.x,
					yD: rot.y,
				}); else if(do_aim){
					cheat.controls[cheat.vars.pchObjc].rotation.x = rot.x;
					cheat.controls.object.rotation.y = rot.y;
					
					data[keys.xdir] = rot.x * 1000;
					data[keys.ydir] = rot.y * 1000;
				}
				
				break
			case'silent':
				
				if(do_aim){
					data[keys.scope] = 1;
					
					if(cheat.config.aim.smooth.status)smooth(cheat, { xD: rot.x, yD: rot.y });
					else {
						data[keys.xdir] = rot.x * 1000;
						data[keys.ydir] = rot.y * 1000;
					}
				}
				
				break
		}
	}
};