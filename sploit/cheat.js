'use strict';
var vars = require('./libs/vars'),
	inputs = require('./input'),
	visual = require('./visual'),
	{ utils } = require('./consts');

exports.add = ent => Object.setPrototypeOf({ entity: typeof ent == 'object' && ent != null ? ent : {} }, exports.player_wrap),

exports.syms = {
	hooked: Symbol(),
	isAI: Symbol(),
};

exports.config = {};

exports.draw_box = () => exports.config.esp.status == 'box' || exports.config.esp.status == 'box_chams' || exports.config.esp.status == 'full';
exports.draw_chams = () => exports.config.esp.status == 'chams' || exports.config.esp.status == 'box_chams' || exports.config.esp.status == 'full';

exports.skins = [...Array(5000)].map((e, i) => ({ ind: i, cnt: 1 }));

exports.player_wrap = {
	distanceTo(p){return Math.hypot(this.x-p.x,this.y-p.y,this.z-p.z)},
	project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)},
	applyMatrix4(t){var e=this.x,n=this.y,r=this.z,i=t.elements,a=1/(i[3]*e+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*e+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*e+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*e+i[6]*n+i[10]*r+i[14])*a,this},
	get x(){ return this.entity.x || 0 },
	get y(){ return this.entity.y || 0 },
	get z(){ return this.entity.z || 0 },
	get can_see(){ return this.entity.can_see },
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
	},
	get can_target(){
		return this.active && this.enemy && this.can_see && this.in_fov;
	},
	get frustum(){
		if(!this.active)return false;
		
		for(var ind = 0; ind < 6; ind++)if(exports.world.frustum.planes[ind].distanceToPoint(this) < 0)return false;
		
		return true;
	},
	get esp_color(){
		// teammate = green, enemy = red, risk + enemy = orange
		var hex = this.enemy ? this.risk ? [ 0xFF, 0x77, 0x00 ] : [ 0xFF, 0x00, 0x00 ] : [ 0x00, 0xFF, 0x00 ],
			inc = this.can_see ? 0x00 : -0x77,
			part_str = part => Math.max(Math.min(part + inc, 0xFF), 0).toString(16).padStart(2, 0);
		
		return '#' + hex.map(part_str).join('');
	},
	get ping(){ return this.entity.ping },
	get jump_bob_y(){ return this.entity.jumpBobY },
	get clan(){ return this.entity.clan },
	get alias(){ return this.entity.alias },
	get weapon(){ return this.entity.weapon },
	get can_slide(){ return this.entity.canSlide },
	get risk(){ return this.entity.isDev || this.entity.isMod || this.entity.isMapMod || this.entity.canGlobalKick || this.entity.canViewReports || this.entity.partnerApp || this.entity.canVerify || this.entity.canTeleport || this.entity.isKPDMode || this.entity.level >= 30 },
	get is_you(){ return this.entity[vars.isYou] },
	get aim_val(){ return this.entity[vars.aimVal] },
	get y_vel(){ return this.entity[vars.yVel] },
	get aim(){ return this.weapon.noAim || !this.aim_val || exports.target && exports.target.active && this.weapon.melee && this.distanceTo(exports.target) <= 18 },
	get aim_press(){ return exports.controls[vars.mouseDownR] || exports.controls.keys[exports.controls.binds.aim.val] },
	get crouch(){ return this.entity[vars.crouchVal] },
	rect(){ // hitbox rect
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
	},
	distance_camera(){
		return exports.world.camera[vars.getWorldPosition]().distanceTo(this);
	},
	get obj(){ return this.entity[vars.objInstances] },
	get recoil_y(){ return this.entity[vars.recoilAnimY] },
	get has_ammo(){ return this.weapon.melee || this.ammo },
	get ammo(){ return this.entity[vars.ammos][this.entity[vars.weaponIndex]] },
	get height(){ return (this.entity.height || 0) - this.entity[vars.crouchVal] * 3 },
	get health(){ return this.entity.health || 0 },
	get max_health(){ return this.entity[vars.maxHealth] || 100 },
	get active(){ return this.entity.active && this.entity.x != null && this.health > 0 && this.obj != null },
	get teammate(){ return this.is_you || exports.player && this.team && this.team == exports.player.team },
	get enemy(){ return !this.teammate },
	get team(){ return this.entity.team },
	get auto_weapon(){ return !this.weapon.nAuto },
	get shot(){ return this.auto_weapon ? this.entity[exports.syms.shot] : this.entity[vars.didShoot] },
};

exports.update_frustum = () => {
	exports.world.frustum.setFromProjectionMatrix(new exports.three.Matrix4().multiplyMatrices(exports.world.camera.projectionMatrix, exports.world.camera.matrixWorldInverse));
};

exports.process = () => {
	if(exports.game && exports.world){
		for(var ent of exports.game.players.list){
			let player = exports.add(ent);
			
			if(!player.active)continue;
			
			if(player.is_you)exports.player = player;
			
			if(exports.player)player.entity.can_see = player.active && utils.obstructing(exports.player, player, exports.player.weapon && exports.player.weapon.pierce && exports.config.aim.wallbangs) == null ? true : false;
			
			if(exports.controls && exports.controls[vars.tmpInpts] && !exports.controls[vars.tmpInpts][exports.syms.hooked]){
				exports.controls[vars.tmpInpts][exports.syms.hooked] = true;
				
				var push = exports.controls[vars.tmpInpts].push;
				
				exports.controls[vars.tmpInpts].push = function(data){
					if(exports.player && exports.player.weapon)inputs(data);
					
					return push.call(this, data);
				}
			}
		}
	};
	
	visual();
	
	requestAnimationFrame(exports.process);
};

exports.socket_id = 0;