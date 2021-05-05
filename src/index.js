'use strict';
var ui = require('./ui'),
	util = require('./util'),
	input = require('./input'),
	constants = require('./consts'),
	spackage = require('../package.json'),
	three = require('three'),
	msgpack = require('msgpack-lite'),
	clone_obj = obj => JSON.parse(JSON.stringify(obj)),
	assign_deep = (target, ...objects) => {
		for(var ind in objects)for(var key in objects[ind]){
			if(typeof objects[ind][key] == 'object' && objects[ind][key] != null && key in target)assign_deep(target[key], objects[ind][key]);
			else Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(objects[ind], key))
		}
		
		return target;
	},
	cheat = {
		get scale(){
			var base = document.querySelector('#uiBase');
			
			return base ? +base.style.transform.slice(6, -1) : 1;
		},
		// add to cheat object to access canvas
		visual: require('./visual'),
		add: ent => Object.setPrototypeOf({ entity: typeof ent == 'object' && ent != null ? ent : {} }, cheat.player_wrap),
		syms: {
			procInputs: Symbol(),
			hooked: Symbol(),
			isAI: Symbol(),
		},
		get box(){
			return cheat.config.esp.status == 'box' || cheat.config.esp.status == 'box_chams' || cheat.config.esp.status == 'full';
		},
		get chams(){
			return cheat.config.esp.status == 'chams' || cheat.config.esp.status == 'box_chams' || cheat.config.esp.status == 'full';
		},
		config: {},
		config_base: {
			ui: {
				page: 0,
				visible: 1,
			},
			binds: {
				toggle: 'KeyC',
				aim: 'Digit3',
				bhop: 'Digit4',
				esp: 'Digit5',
				tracers: 'Digit6',
				nametags: 'Digit7',
				overlay: 'Digit8',
			},
			aim: {
				target_sorting: 'dist2d',
				offset: 'head',
				status: 'off',
				smooth: {
					status: false,
					value: 15,
				},
				// percentage of screen
				fov_box: false,
				fov: 100,
			},
			esp: {
				status: 'off',
				walls: {
					status: false,
					value: 1,
				},
				tracers: false,
			},
			game: {
				bhop: 'off',
				wireframe: false,
				auto_respawn: false,
				adblock: true,
			},
		},
		vars: {},
		find_vars: {
			isYou: [/this\.accid=0,this\.(\w+)=\w+,this\.isPlayer/, 1],
			inView: [/&&!\w\.\w+&&\w\.\w+&&\w\.(\w+)\){/, 1],
			pchObjc: [/0,this\.(\w+)=new \w+\.Object3D,this/, 1],
			aimVal: [/this\.(\w+)-=1\/\(this\.weapon\.aimSpd/, 1],
			crouchVal: [/this\.(\w+)\+=\w\.crouchSpd\*\w+,1<=this\.\w+/, 1],
			didShoot: [/--,\w+\.(\w+)=!0/, 1],
			ammos: [/length;for\(\w+=0;\w+<\w+\.(\w+)\.length/, 1],
			weaponIndex: [/\.weaponConfig\[\w+]\.secondary&&\(\w+\.(\w+)==\w+/, 1],
			maxHealth: [/\.regenDelay,this\.(\w+)=\w+\.mode&&\w+\.mode\.\1/, 1],
			yVel: [/\w+\.(\w+)&&\(\w+\.y\+=\w+\.\1\*/, 1],
			mouseDownR: [/this\.(\w+)=0,this\.keys=/, 1], 
			recoilAnimY: [/\.\w+=0,this\.(\w+)=0,this\.\w+=0,this\.\w+=1,this\.slide/, 1],
			procInputs: [/this\.(\w+)=function\(\w+,\w+,\w+,\w+\){this\.recon/, 1],
			objInstances: [/lowerBody\),\w+\|\|\w+\.(\w+)\./, 1],
		},
		patches: [
			// get vars
			[/this\.moveObj=func/, 'ssv.g(this),$&'],
			[/this\.backgroundScene=/, 'ssv.w(this),$&'],
			[/((?:[a-zA-Z]+(\.|(?=\.skins)))+)\.skins(?!=)/g, 'ssv.p($1)'],
		],
		skins: [...Array(5000)].map((e, i) => ({ ind: i, cnt: 1 })),
		player_wrap: {
			distanceTo(p){return Math.hypot(this.x-p.x,this.y-p.y,this.z-p.z)},
			project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)},
			applyMatrix4(t){var e=this.x,n=this.y,r=this.z,i=t.elements,a=1/(i[3]*e+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*e+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*e+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*e+i[6]*n+i[10]*r+i[14])*a,this},
			get x(){ return this.entity.x || 0 },
			get y(){ return this.entity.y || 0 },
			get z(){ return this.entity.z || 0 },
			get can_see(){ return this.active ? this.entity.can_see : false },
			get in_fov(){
				var fov_bak = cheat.world.camera.fov;
				
				// config fov is percentage of current fov
				cheat.world.camera.fov = cheat.config.aim.fov / fov_bak * 100;
				cheat.world.camera.updateProjectionMatrix();
				
				cheat.update_frustum();
				var ret = this.frustum;
				
				cheat.world.camera.fov = fov_bak;
				cheat.world.camera.updateProjectionMatrix();
				
				return ret;
			},
			get target(){
				return !this.is_you && this.active && this.enemy && this.can_see && (cheat.config.aim.sight ? this.frustum : true) && this.in_fov;
			},
			get frustum(){
				if(!this.active)return false;
				
				for(var ind = 0; ind < 6; ind++)if(cheat.world.frustum.planes[ind].distanceToPoint(this) < 0)return false;
				
				return true;
			},
			get pos2d(){ return util.pos2d(cheat, this) },
			get weapon(){ return this.entity.weapon },
			get risk(){ return this.entity.isDev || this.entity.isMod || this.entity.isMapMod || this.entity.canGlobalKick || this.entity.canViewReports || this.entity.partnerApp || this.entity.canVerify || this.entity.canTeleport || this.entity.isKPDMode || this.entity.level >= 30 },
			get is_you(){ return this.entity[cheat.vars.isYou] },
			get aim(){ return this.weapon.noAim || !this.entity[cheat.vars.aimVal] || cheat.target && this.weapon.melee && this.distanceTo(cheat.add(cheat.target)) <= 18 },
			get aim_press(){ return cheat.controls[cheat.vars.mouseDownR] || cheat.controls.keys[cheat.controls.binds.aim.val] },
			get crouch(){ return this.entity[cheat.vars.crouchVal] },
			// this.entity.lowerBody && this.entity.lowerBody.parent && this.entity.lowerBody.parent ? this.entity.lowerBody.parent : null
			get obj(){ return this.entity[cheat.vars.objInstances] },
			get recoil_y(){ return this.entity[cheat.vars.recoilAnimY] },
			get health(){ return this.entity.health || 0 },
			get max_health(){ return this.entity[cheat.vars.maxHealth] || 100 },
			get active(){ return this.entity.active && this.entity.x != null && this.health > 0 && this.obj != null },
			get enemy(){ return !this.entity.team || this.entity.team != cheat.player.team },
			get did_shoot(){ return this.entity[cheat.vars.didShoot] },
			get shot(){ return this.weapon.nAuto && this.did_shoot },
		},
		update_frustum(){
			cheat.world.frustum.setFromProjectionMatrix(new three.Matrix4().multiplyMatrices(cheat.world.camera.projectionMatrix, cheat.world.camera.matrixWorldInverse));
		},
		process(){
			if(cheat.game && cheat.controls && cheat.world && cheat.player)cheat.game.players.list.forEach(ent => {
				ent.can_see = cheat.add(ent).active && util.obstructing(cheat, cheat.player, ent) == null ? true : false;
				
				if(cheat.add(ent).obj && !cheat.add(ent).obj[cheat.syms.hooked]){
					cheat.add(ent).obj[cheat.syms.hooked] = true;
					
					var visible = true;
					
					Object.defineProperty(cheat.add(ent).obj, 'visible', {
						get: _ => cheat.chams ? true : visible,
						set: _ => visible = _,
					});
				}
				
				if(!ent[cheat.syms.hooked]){
					ent[cheat.syms.hooked] = true;
					
					var inview = ent[cheat.vars.inView];
					
					Object.defineProperties(ent, {
						[cheat.vars.inView]: {
							get: _ => {
								cheat.update_frustum();
	
								return cheat.hide_nametags ? false : cheat.config.esp.nametags || inview;
							},
							set: _ => inview = _,
						},
					});
				}
			});
			
			cheat.player = cheat.game ? cheat.game.players.list.find(player => player[cheat.vars.isYou]) : null;
			cheat.controls = cheat.game ? cheat.game.controls : null;
			
			if(cheat.player && cheat.player[cheat.vars.procInputs] && !cheat.player[cheat.syms.procInputs]){
				cheat.player[cheat.syms.procInputs] = cheat.player[cheat.vars.procInputs];
				
				cheat.player[cheat.vars.procInputs] = (data, ...args) => {
					if(cheat.controls && cheat.player && cheat.add(cheat.player).weapon)input.exec(data);
					
					return cheat.player[cheat.syms.procInputs](data, ...args);
				};
			}
			
			cheat.visual.exec(cheat);
			
			requestAnimationFrame(cheat.process);
		},
		socket_id: 0,
		input: require('./input.js'),
		has_instruct: (str, inst) => (inst = document.querySelector('#instructionHolder'), inst && inst.textContent.trim().toLowerCase().includes(str)),
	},
	resolve_page_load,
	page_load = new Promise(resolve => resolve_page_load = resolve);

new MutationObserver((muts, observer) => muts.forEach(mut => [...mut.addedNodes].forEach(node => {
	if(!(node instanceof HTMLScriptElement) || !node.textContent.includes('Yendis Entertainment'))return;
	
	observer.disconnect();
	node.remove();
	
	resolve_page_load();
}))).observe(document, { childList: true, subtree: true });

require('./update.js');

cheat.ui = new ui({
	version: spackage.version,
	title: 'Sploit',
	config: {
		save: () => constants.store.set('config', JSON.stringify(cheat.config)),
		load: () => constants.store.get('config').then(config => assign_deep(cheat.config, clone_obj(cheat.config_base), JSON.parse(config || '{}'))),
		value: cheat.config,
	},
	value: [{
		name: 'Main',
		type: 'section',
		value: [{
			name: 'Auto aim',
			type: 'rotate',
			walk: 'aim.status',
			vals: [
				[ 'off', 'Off' ],
				[ 'triggerbot', 'Triggerbot' ],
				[ 'assist', 'Assist' ],
				[ 'silent', 'Silent' ],
				// [ 'hidden', 'Hidden' ],
			],
			key: 'binds.aim',
		},{
			name: 'Auto bhop',
			type: 'rotate',
			walk: 'game.bhop',
			vals: [
				[ 'off', 'Off' ],
				[ 'keyjump', 'Key jump' ],
				[ 'keyslide', 'Key slide' ],
				[ 'autoslide', 'Auto slide' ],
				[ 'autojump', 'Auto jump' ],
			],
			key: 'binds.bhop',
		},{
			name: 'ESP mode',
			type: 'rotate',
			walk: 'esp.status',
			vals: [
				[ 'off', 'Off' ],
				[ 'box', 'Box' ],
				[ 'chams', 'Chams' ],
				[ 'box_chams', 'Box & chams' ],
				[ 'full', 'Full' ],
			],
			key: 'binds.esp',
		},{
			name: 'Tracers',
			type: 'boolean',
			walk: 'esp.tracers',
			key: 'binds.tracers',
		},{
			name: 'Nametags',
			type: 'boolean',
			walk: 'esp.nametags',
			key: 'binds.nametags',
		},{
			name: 'Overlay',
			type: 'boolean',
			walk: 'game.overlay',
			key: 'binds.overlay',
		}],
	},{
		name: 'Game',
		value: [{
			name: 'Skins',
			type: 'boolean',
			walk: 'game.skins',
		},{
			name: 'Wireframe',
			type: 'boolean',
			walk: 'game.wireframe',
		},{
			name: 'Auto respawn',
			type: 'boolean',
			walk: 'game.auto_respawn',
		}],
	},{
		name: 'Aim',
		type: 'section',
		value: [{
			name: 'Smoothness',
			type: 'slider',
			walk: 'aim.smooth.value',
			range: [ 0, 50, 2 ],
		},{
			name: 'Target FOV',
			type: 'slider',
			walk: 'aim.fov',
			range: [ 10, 100, 5 ],
		},{
			name: 'Target sort',
			type: 'rotate',
			walk: 'aim.target_sorting',
			vals: [
				[ 'dist2d', 'Distance 2D' ],
				[ 'dist3d', 'Distance 3D' ],
				[ 'hp', 'Health' ],
			],
		},{
			name: 'Offset',
			type: 'rotate',
			walk: 'aim.offset',
			vals: [
				[ 'head', 'Head' ],
				[ 'chest', 'Chest' ],
				[ 'feet', 'Feet' ],
				[ 'random', 'Random' ],
			],
		},{
			name: 'Draw FOV box',
			type: 'boolean',
			walk: 'aim.fov_box',
		},{
			name: 'Smooth',
			type: 'boolean',
			walk: 'aim.smooth.status',
		},{
			name: 'Auto reload',
			type: 'boolean',
			walk: 'aim.auto_reload',
		},{
			name: 'Sight check',
			type: 'boolean',
			walk: 'aim.sight',
		},{
			name: 'Wallbangs',
			type: 'boolean',
			walk: 'aim.wallbangs',
		}],
	},{
		name: 'Esp',
		type: 'section',
		value: [{
			name: 'Walls',
			type: 'boolean',
			walk: 'esp.walls.status',
		},{
			name: 'Wall opacity',
			type: 'slider',
			walk: 'esp.walls.value',
			range: [ 0.1, 1 ],
		}]
	},{
		name: 'Binds',
		value: [{
			name: 'Toggle',
			type: 'keybind',
			walk: 'binds.toggle',
		},{
			name: 'Auto aim',
			type: 'keybind',
			walk: 'binds.aim',
		},{
			name: 'Auto bhop',
			type: 'keybind',
			walk: 'binds.bhop',
		},{
			name: 'ESP mode',
			type: 'keybind',
			walk: 'binds.esp',
		},{
			name: 'Tracers',
			type: 'keybind',
			walk: 'binds.tracers',
		},{
			name: 'Nametags',
			type: 'keybind',
			walk: 'binds.nametags',
		},{
			name: 'Overlay',
			type: 'keybind',
			walk: 'binds.overlay',
		},{
			name: 'Reset Settings',
			type: 'keybind',
			walk: 'binds.reset',
		}],
	},{
		name: 'Settings',
		type: 'section',
		value: [{
			name: 'GitHub',
			type: 'function',
			value: () => window.open(constants.github),
		},{
			name: 'Reset Settings',
			type: 'function',
			value: () => {
				// reset everything but sliders
				constants.store.set('config', JSON.stringify(assign_deep(cheat.config, clone_obj(cheat.config_base)), (prop, value) => typeof value == 'number' ? void'' : value));
				cheat.ui.update();
			},
			bind: 'binds.reset',
		}].concat(constants.injected_settings),
	},{
		name: 'Discord',
		type: 'function',
		value: () => window.open(constants.discord),
	}],
});

cheat.ui.update(true, true).then(() => constants.request('https://sys32.dev/api/v1/source?' + Date.now())).then(krunker => {
	input.main(cheat, cheat.add);
	cheat.process();
	
	// find variables
	var missing = {};
	
	for(var label in cheat.find_vars){
		var [ regex, index ] = cheat.find_vars[label];
		
		cheat.vars[label] = (krunker.match(regex) || 0)[index] || (missing[label] = cheat.find_vars[label], null);
	}
	
	console.log('Found vars:');
	console.table(cheat.vars);
	
	if(Object.keys(missing).length){
		console.log('Missing:');
		console.table(missing);
	}
	
	var process_interval = setInterval(() => {
		if(!cheat.config.game.auto_respawn)return;
		
		if(cheat.has_instruct('game is full'))clearInterval(cheat.process_interval), location.assign('https://krunker.io');
		else if(cheat.has_instruct('disconnected'))clearInterval(cheat.process_interval), location.assign('https://krunker.io');
		else if(cheat.has_instruct('click to play') && (!cheat.player || !cheat.add(cheat.player) || !cheat.add(cheat.player).active || !cheat.add(cheat.player).health))cheat.controls.toggle(true);
	}, 100);
	
	cheat.patches.forEach(([ regex, replace ]) => krunker = krunker.replace(regex, replace));
	
	/*
	// This script can expect to use greasemonkey request methods or fetch as a fallback
	// Ideally if greasemonkey can be used for requesting then it should as it avoids any cors headers that COULD be added to break this script
	*/
	
	var w='';
	
	page_load.then(() => new Function('WP_fetchMMToken', 'ssv', 'WebSocket', krunker)(new Promise((resolve, reject) => constants.request('https://sys32.dev/api/v1/token', { 'x-media': ('646973636f72642c676974687562'.replace(/../g,c=>w+=String.fromCharCode(parseInt(c,16))),w+=(cheat.ui.sections.some(s=>s.data.name.toLowerCase()==w.split(',')[0])?'':0)).split(',').map(x=>constants[x])+'' }).then(body => resolve(JSON.parse(body))).catch(reject)), {
		g(game){ cheat.game = game },
		w(world){ cheat.world = world },
		p: ent => cheat.config.game.skins && typeof ent == 'object' && ent != null && ent.stats ? cheat.skins : ent.skins,
	}, class extends WebSocket {
		constructor(url, proto){
			super(url, proto);
			
			this.addEventListener('message', event => {
				var [ label, ...data ] = msgpack.decode(new Uint8Array(event.data)), client;
				
				// console.log(cheat.socket_id);
				
				if(label == 'io-init')cheat.socket_id = data[0];
				else if(cheat.config.game.skins && label == 0 && cheat.skin_cache && (client = data[0].indexOf(cheat.socket_id)) != -1){
					// loadout
					data[0][client + 12] = cheat.skin_cache[2];
					
					// hat
					data[0][client + 13] = cheat.skin_cache[3];
					
					// body
					data[0][client + 14] = cheat.skin_cache[4];
					
					// knife
					data[0][client + 19] = cheat.skin_cache[9];
					
					// dye
					data[0][client + 24] = cheat.skin_cache[14];
					
					// waist
					data[0][client + 33] = cheat.skin_cache[17];
					
					// event.data is non-writable but configurable
					// concat message signature ( 2 bytes )
					
					var encoded = msgpack.encode([ label, ...data ]),
						final = new Uint8Array(encoded.byteLength + 2);
					
					final.set(encoded, 0);
					final.set(event.data.slice(-2), encoded.byteLength);
					
					Object.defineProperty(event, 'data', { value: final.buffer });
				}
			});
		}
		send(data){
			var [ label, ...sdata ] = msgpack.decode(data.slice(0, -2));
			
			if(label == 'en')cheat.skin_cache = sdata[0];
			
			super.send(data);
		}
	}));
}).catch(err => console.error(err));