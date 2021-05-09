'use strict';
var api = require('./api'),
	utils = require('./utils'),
	input = require('./input'),
	visual = require('./visual'),
	constants = require('./consts'),
	spackage = require('../package.json'),
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
		UI: require('./ui'),
		add: ent => Object.setPrototypeOf({ entity: typeof ent == 'object' && ent != null ? ent : {} }, cheat.player_wrap),
		syms: {
			shot: Symbol(),
			procInputs: Symbol(),
			hooked: Symbol(),
			isAI: Symbol(),
		},
		config: {},
		config_base: {
			ui_page: 0,
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
				hitchance: 100,
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
				css: [],
				bhop: 'off',
				wireframe: false,
				auto_respawn: false,
				adblock: true,
				teammates: true,
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
			[/(\((\w+),\w+,\w+\){)([a-z ';\.\(\),]+ACESFilmic)/, '$1ssv.t($2);$3'],
			[/this\.backgroundScene=/, 'ssv.w(this),$&'],
			[/((?:[a-zA-Z]+(\.|(?=\.skins)))+)\.skins(?!=)/g, 'ssv.p($1)'],
		],
		get players(){
			return this.game ? this.game.players.list.map(this.add) : [];
		},
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
				if(cheat.config.aim.fov == 100)return this.in_sight;
				
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
			get in_sight(){
				return cheat.config.aim.sight ? this.frustum : true;
			},
			get target(){
				return this.active && this.enemy && this.can_see && this.in_fov;
			},
			get frustum(){
				if(!this.active)return false;
				
				for(var ind = 0; ind < 6; ind++)if(cheat.world.frustum.planes[ind].distanceToPoint(this) < 0)return false;
				
				return true;
			},
			get esp_color(){
				// teammate = green, enemy = red, risk + enemy = orange
				var hex = this.enemy ? this.risk ? [ 0xFF, 0x77, 0x00 ] : [ 0xFF, 0x00, 0x00 ] : [ 0x00, 0xFF, 0x00 ],
					inc = this.can_see ? 0x00 : -0x77,
					part_str = part => Math.max(Math.min(part + inc, 0xFF), 0).toString(16).padStart(2, 0);
				
				return '#' + hex.map(part_str).join('');
			},
			get jump_bob_y(){ return this.entity.jumpBobY },
			get pos2d(){ return utils.pos2d(cheat, this) },
			get clan(){ return this.entity.clan },
			get alias(){ return this.entity.alias },
			get weapon(){ return this.entity.weapon },
			get can_slide(){ return this.entity.canSlide },
			get risk(){ return this.entity.isDev || this.entity.isMod || this.entity.isMapMod || this.entity.canGlobalKick || this.entity.canViewReports || this.entity.partnerApp || this.entity.canVerify || this.entity.canTeleport || this.entity.isKPDMode || this.entity.level >= 30 },
			get is_you(){ return this.entity[cheat.vars.isYou] },
			get aim_val(){ return this.entity[cheat.vars.aimVal] },
			get y_vel(){ return this.entity[cheat.vars.yVel] },
			get aim(){ return this.weapon.noAim || !this.aim_val || cheat.target && this.weapon.melee && this.distanceTo(cheat.target) <= 18 },
			get aim_press(){ return cheat.controls[cheat.vars.mouseDownR] || cheat.controls.keys[cheat.controls.binds.aim.val] },
			get crouch(){ return this.entity[cheat.vars.crouchVal] },
			// this.entity.lowerBody && this.entity.lowerBody.parent && this.entity.lowerBody.parent ? this.entity.lowerBody.parent : null
			rect2d(){
				var src_pos = this.pos2d,
					src_pos_crouch = utils.pos2d(cheat, this, this.entity.height - this.crouch * 3),
					width = ~~((src_pos.y - utils.pos2d(cheat, this, this.entity.height).y) * 0.7),
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
			get draw_visual(){
				return !cheat.config.esp.teammates || !this.teammate;
			},
			get draw_nametags(){
				return this.draw_visual && cheat.config.esp.nametags;
			},
			get draw_box(){
				return this.draw_visual && (cheat.config.esp.status == 'box' || cheat.config.esp.status == 'box_chams' || cheat.config.esp.status == 'full');
			},
			get draw_chams(){
				return this.draw_visual && (cheat.config.esp.status == 'chams' || cheat.config.esp.status == 'box_chams' || cheat.config.esp.status == 'full');
			},
			get obj(){ return this.entity[cheat.vars.objInstances] },
			get recoil_y(){ return this.entity[cheat.vars.recoilAnimY] },
			get has_ammo(){ return this.weapon.melee || this.ammo },
			get ammos(){ return this.entity[cheat.vars.ammos] },
			get ammo(){ return this.ammos[this.weapon_index] },
			get weapon_index(){ return this.entity[cheat.vars.weaponIndex] },
			get height(){ return this.entity.height },
			get health(){ return this.entity.health || 0 },
			get max_health(){ return this.entity[cheat.vars.maxHealth] || 100 },
			get active(){ return this.entity.active && this.entity.x != null && this.health > 0 && this.obj != null },
			get teammate(){ return this.is_you || this.team && this.team == cheat.player.team },
			get enemy(){ return !this.teammate },
			get team(){ return this.entity.team },
			get did_shoot(){ return this.entity[cheat.vars.didShoot] },
			get auto_weapon(){ return this.weapon.nAuto },
			get shot(){ return this.entity[cheat.syms.shot] },
		},
		update_frustum(){
			cheat.world.frustum.setFromProjectionMatrix(new cheat.three.Matrix4().multiplyMatrices(cheat.world.camera.projectionMatrix, cheat.world.camera.matrixWorldInverse));
		},
		process(){
			if(cheat.game && cheat.controls && cheat.world && cheat.player)cheat.players.forEach(ent => {
				ent.entity.can_see = ent.active && utils.obstructing(cheat, cheat.player, ent) == null ? true : false;
				
				if(ent.obj && !ent.obj[cheat.syms.hooked]){
					ent.obj[cheat.syms.hooked] = true;
					
					var visible = true;
					
					Object.defineProperty(ent.obj, 'visible', {
						get: _ => ent.draw_chams || visible,
						set: _ => visible = _,
					});
				}
				
				if(!ent[cheat.syms.hooked]){
					ent[cheat.syms.hooked] = true;
					
					var inview = ent[cheat.vars.inView];
					
					Object.defineProperties(ent.entity, {
						[cheat.vars.inView]: {
							get: _ => {
								cheat.update_frustum();
	
								return cheat.config.esp.status == 'full' ? false : ent.draw_nametags || inview;
							},
							set: _ => inview = _,
						},
					});
				}
			});
			
			if(cheat.player.active && cheat.player.entity[cheat.vars.procInputs] && !cheat.player.entity[cheat.syms.procInputs]){
				cheat.player.entity[cheat.syms.procInputs] = cheat.player.entity[cheat.vars.procInputs];
				
				cheat.player.entity[cheat.vars.procInputs] = (data, ...args) => {
					if(cheat.controls && cheat.player.weapon)input.exec(data);
					
					return cheat.player.entity[cheat.syms.procInputs](data, ...args);
				};
			}
			
			visual.exec();
			
			requestAnimationFrame(cheat.process);
		},
		get player(){
			return this.players.find(player => player.is_you) || {};
		},
		get controls(){
			return this.game ? this.game.controls : null;
		},
		target: {},
		socket_id: 0,
		input: require('./input.js'),
		has_instruct: (str, inst) => (inst = document.querySelector('#instructionHolder'), inst && inst.textContent.trim().toLowerCase().includes(str)),
	},
	resolve_page_load,
	page_load = new Promise(resolve => resolve_page_load = resolve);

new MutationObserver((muts, observer) => muts.forEach(mut => [...mut.addedNodes].forEach(node => {
	if(node.tagName != 'SCRIPT' || !node.textContent.includes('Yendis Entertainment'))return;
	
	observer.disconnect();
	node.textContent = '';
	
	resolve_page_load();
}))).observe(document, { childList: true, subtree: true });

cheat.UI.ready.then(() => {
	cheat.ui = new cheat.UI.Config({
		version: spackage.version,
		title: 'Sploit',
		store: constants.store,
		config: {
			save: () => constants.store.set('config', JSON.stringify(cheat.config)),
			load: () => constants.store.get('config').then(config => {
				var parsed = {};
				try{ parsed = JSON.parse(config || '{}') }catch(err){ console.error(err, config) }
				
				return assign_deep(cheat.config, clone_obj(cheat.config_base), parsed);
			}),
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
					[ 'trigger', 'Triggerbot' ],
					[ 'correction', 'Correction' ],
					[ 'assist', 'Assist' ],
					[ 'auto', 'Automatic' ],
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
				name: 'Custom CSS',
				type: 'function',
				value: () => cheat.css_editor.show(),
			},{
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
				range: [ 10, 100, 10 ],
			},{
				name: 'Hitchance',
				type: 'slider',
				walk: 'aim.hitchance',
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
				name: 'Teammates',
				type: 'boolean',
				walk: 'esp.teammates',
			},{
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
				name: 'Reset',
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
				async value(){
					for(var ind in cheat.css_editor.tabs.length)await cheat.css_editor.tabs[ind].remove();
					
					// reset everything but sliders
					await constants.store.set('config', JSON.stringify(assign_deep(cheat.config, clone_obj(cheat.config_base)), (prop, value) => typeof value == 'number' ? void'' : value));
					cheat.ui.update();
				},
				bind: 'binds.reset',
			}],
		},{
			name: 'Discord',
			type: 'function',
			value: () => window.open(constants.discord),
		}],
	});

	cheat.ui.update(true).then(async () => cheat.css_editor = new cheat.UI.Editor({
		tabs: cheat.config.game.css,
		store: constants.store,
		save(tabs){
			cheat.config.game.css = tabs;
			cheat.ui.config.save();
		},
	})).then(() => api.source()).then(krunker => {
		input.main(cheat, cheat.add);
		visual.main(cheat);
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
			// 0x1, 0x2 = account & ip
			if(cheat.has_instruct('connection banned'))clearInterval(process_interval), localStorage.removeItem('krunker_token'), cheat.UI.alert([
				`<p>You were IP banned, Sploit has signed you out.\nSpoof your IP to bypass this ban with one of the following:</p>`,
				`<ul>`,
					`<li>Using your mobile hotspot</li>`,
					...constants.proxy_addons.filter(data => data[constants.supported_store]).map(data => `<li><a target='_blank' href=${JSON.stringify(data[constants.supported_store])}>${data.name}</a></li>`),
					`<li>Use a <a href=${JSON.stringify(constants.addon_url('Proxy VPN'))}>Proxy/VPN</a></li>`,
				`</ul>`,
			].join(''));
			
			if(!cheat.config.game.auto_respawn)return;
			
			if(cheat.has_instruct('game is full'))clearInterval(process_interval), location.assign('https://krunker.io');
			else if(cheat.has_instruct('disconnected'))clearInterval(process_interval), location.assign('https://krunker.io');
			else if(cheat.has_instruct('click to play') && !cheat.player.active)cheat.controls.toggle(true);
		}, 100);
		
		cheat.patches.forEach(([ regex, replace ]) => krunker = krunker.replace(regex, replace));
		
		/*
		// This script can expect to use greasemonkey request methods or fetch as a fallback
		// Ideally if greasemonkey can be used for requesting then it should as it avoids any cors headers that COULD be added to break this script
		*/
		
		// Just dont fuck with consts and discord
		api.init(cheat);
		
		page_load.then(() => new Function('WP_fetchMMToken', 'ssv', 'WebSocket', krunker)(api.token(), {
			t(three_mod){ cheat.three = three_mod.exports },
			g(game){ cheat.game = game },
			w(world){ cheat.world = world },
			p: ent => cheat.config.game.skins && typeof ent == 'object' && ent != null && ent.stats ? cheat.skins : ent.skins,
		}, class extends WebSocket {
			constructor(url, proto){
				super(url, proto);
				
				this.addEventListener('message', event => {
					var [ label, ...data ] = msgpack.decode(new Uint8Array(event.data)), client;
					
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
	});
});

require('./update.js');