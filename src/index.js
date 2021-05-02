'use strict';
var ui = require('./ui.js'),
	add = ent => new cheat.player_wrap(ent),
	constants = require('./consts.js'),
	spackage = require('../package.json'),
	msgpack = require('msgpack-lite'),
	cheat = {
		assign_deep: (e,...a)=>(a.forEach(a=>Object.keys(a).forEach(r=>typeof a[r]=='object'&&a[r]!=null&&!Array.isArray(a[r])&&r in e?cheat.assign_deep(e[r],a[r]):e[r]=a[r])),e),
		syms: new Proxy({}, {
			get(target, prop){
				if(!target[prop])target[prop] = Symbol();
				
				return target[prop];
			}
		}),
		three: require('three'),
		get box(){
			return cheat.config.esp.status == 'box' || cheat.config.esp.status == 'box_chams' || cheat.config.esp.status == 'full';
		},
		get chams(){
			return cheat.config.esp.status == 'chams' || cheat.config.esp.status == 'box_chams' || cheat.config.esp.status == 'full';
		},
		config: {
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
			},
			esp: {
				status: 'off',
				walls: {
					status: false,
					value: 1,
				},
			},
			game: {
				bhop: 'off',
				wireframe: false,
				auto_respawn: false,
				adblock: true,
			},
		},
		util: require('./util.js'),
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
			[/this\.moveObj=func/, 'ssd.game = this, $&'],
			[/this\.backgroundScene=/, 'ssd.world = this, $&'],
			
			[/(function\(\w+,\w+,\w+\)\{var (?:\w+=\w+\(\d+\),?){3};\w+\.exports=)({(?:\w+:\w+,)+socket:)/, '$1ssd.ws=$2'],
			[/((?:[a-zA-Z]+(\.|(?=\.skins)))+)\.skins(?!=)/g, 'ssd.skin($1)'],
		],
		skins: [...Array(5000)].map((e, i) => ({ ind: i, cnt: 1 })),
		skin(player){
			return cheat.config.game.skins && player && player.alias ? cheat.skins : player.skins;
		},
		visual: require('./visual.js'),
		player_wrap: class {
			constructor(entity){ this.entity = entity }
			distanceTo(p){return Math.hypot(this.x-p.x,this.y-p.y,this.z-p.z)}
			project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}
			applyMatrix4(t){var e=this.x,n=this.y,r=this.z,i=t.elements,a=1/(i[3]*e+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*e+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*e+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*e+i[6]*n+i[10]*r+i[14])*a,this}
			get x(){ return this.entity.x || 0 }
			get y(){ return this.entity.y || 0 }
			get z(){ return this.entity.z || 0 }
			get can_see(){ return this.active ? this.entity.can_see : false }
			get frustum(){ for(var ind = 0; ind < 6; ind++)if(cheat.world.frustum.planes[ind].distanceToPoint(this) < 0)return false; return true }
			get pos2d(){ return cheat.util.pos2d(cheat, this) }
			get weapon(){ return this.entity.weapon }
			get risk(){ return this.entity.isDev || this.entity.isMod || this.entity.isMapMod || this.entity.canGlobalKick || this.entity.canViewReports || this.entity.partnerApp || this.entity.canVerify || this.entity.canTeleport || this.entity.isKPDMode || this.entity.level >= 30 }
			get is_you(){ return this.entity[cheat.vars.isYou] }
			get aim(){ return this.weapon.noAim || !this.entity[cheat.vars.aimVal] || cheat.target && this.weapon.melee && this.distanceTo(add(cheat.target)) <= 18 }
			get aim_press(){ return cheat.controls[cheat.vars.mouseDownR] || cheat.controls.keys[cheat.controls.binds.aim.val] }
			get crouch(){ return this.entity[cheat.vars.crouchVal] }
			get obj(){ return this.entity[cheat.vars.objInstances] } // this.entity.lowerBody && this.entity.lowerBody.parent && this.entity.lowerBody.parent ? this.entity.lowerBody.parent : null }
			get recoil_y(){ return this.entity[cheat.vars.recoilAnimY] }
			get health(){ return this.entity.health || 0 }
			get max_health(){ return this.entity[cheat.vars.maxHealth] || 100 }
			get active(){ return !this.entity.isHidden && cheat.ctx && this.entity.x != null && this.obj && this.health > 0 }
			get enemy(){ return !this.entity.team || this.entity.team != cheat.player.team }
			get did_shoot(){ return this.entity[cheat.vars.didShoot] }
			get shot(){ return this.weapon.nAuto && this.did_shoot }
		},
		process(){
			if(cheat.game && cheat.controls && cheat.world && cheat.player)cheat.game.players.list.forEach(ent => {
				ent.can_see = add(ent).active && cheat.util.obstructing(cheat, cheat.player, ent) == null ? true : false;
				
				if(add(ent).obj && !add(ent).obj[cheat.syms.hooked]){
					add(ent).obj[cheat.syms.hooked] = true;
					
					var visible = true;
					
					Object.defineProperty(add(ent).obj, 'visible', {
						get: _ => cheat.chams ? true : visible,
						set: _ => visible = _,
					});
				}
				
				if(!ent[cheat.syms.hooked]){
					ent[cheat.syms.hooked] = true;
					
					var inview = ent[cheat.vars.inView];
					
					Object.defineProperty(ent, cheat.vars.inView, {
						get: _ => cheat.hide_nametags ? false : cheat.config.esp.nametags || inview,
						set: _ => inview = _,
					});
				}
			});
			
			cheat.player = cheat.game ? cheat.game.players.list.find(player => player[cheat.vars.isYou]) : null;
			cheat.controls = cheat.game ? cheat.game.controls : null;
			
			if(cheat.player && cheat.player[cheat.vars.procInputs] && !cheat.player[cheat.syms.procInputs]){
				cheat.player[cheat.syms.procInputs] = cheat.player[cheat.vars.procInputs];
				
				cheat.player[cheat.vars.procInputs] = (data, ...args) => {
					if(cheat.controls && cheat.player && add(cheat.player).weapon)cheat.input.exec(data);
					
					return cheat.player[cheat.syms.procInputs](data, ...args);
				};
			}
			
			cheat.visual.exec();
			
			requestAnimationFrame(cheat.process);
		},
		input: require('./input.js'),
		has_instruct: (str, inst) => (inst = document.querySelector('#instructionHolder'), inst && inst.textContent.trim().toLowerCase().includes(str)),
		process_interval: setInterval(() => {
			// automatic stuff
			
			if(cheat.config.game.auto_respawn){
				if(cheat.has_instruct('game is full'))clearInterval(cheat.process_interval), location.assign('https://krunker.io');
				else if(cheat.has_instruct('disconnected'))clearInterval(cheat.process_interval), location.assign('https://krunker.io');
				else if(cheat.has_instruct('click to play') && (!cheat.player || !add(cheat.player) || !add(cheat.player).active || !add(cheat.player).health))cheat.controls.toggle(true);
			}
		}, 100),
		resize_cas(){
			this.cas.width = window.innerWidth;
			this.cas.height = window.innerHeight;
		},
		cas: constants.add_ele('canvas', document.documentElement, { style: 'top:0px;left:0px;background:#0000;pointer-events:none;position:absolute;width:100%;height:100%;z-index:8999999', width: window.innerWidth, height: window.innerHeight }),
	};

cheat.ui = new ui.init({
	version: spackage.version,
	title: 'Sploit',
	config: {
		save: () => constants.store.set('config', JSON.stringify(cheat.config)),
		load: () => constants.store.get('config').then(config => cheat.assign_deep(cheat.config, JSON.parse(config || '{}'))),
		state: () => cheat.config, // for setting walked objects
	},
	values: [{
		name: 'Main',
		contents: [{
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
		contents: [/*{
			name: 'Skins',
			type: 'boolean',
			walk: 'game.skins',
		},*/{
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
		contents: [{
			name: 'Smoothness',
			type: 'slider',
			walk: 'aim.smooth.value',
			range: [ 0, 50 ],
		},{
			name: 'Target sorting',
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
		contents: [{
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
		contents: [{
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
		}],
	},{
		name: 'Settings',
		contents: [{
			name: 'Join the Discord',
			type: 'function',
			value: () => window.open('https://e9x.github.io/kru/invite'),
		},{
			name: 'Source code',
			type: 'function',
			value: () => window.open('https://github.com/e9x/kru'),
		}].concat(constants.injected_settings),
	}],
});

new MutationObserver((muts, observer) => muts.forEach(mut => [...mut.addedNodes].forEach(node => {
	if(!(node instanceof HTMLScriptElement) || !node.textContent.includes('Yendis Entertainment'))return;
	
	observer.disconnect();
	node.remove();
	
	new constants.request('https://sys32.dev/api/v1/source', true).text().then(krunker => {
		// find variables
		for(var label in cheat.find_vars){
			var [ regex, index ] = cheat.find_vars[label];
			
			cheat.vars[label] = (krunker.match(regex) || 0)[index] || console.error('Could not find', name, regex, 'at index', index);
		}
		
		// apply patches
		cheat.patches.forEach(([ regex, replace ]) => krunker = krunker.replace(regex, replace));
		
		/*
		// WP_fetchMMToken does not need to be specified as the vars injected will automatically add it
		// this script can expect to use greasemonkey request methods or fetch as a fallback
		// ideally if greasemonkey can be used for requesting then it should as it avoids any cors headers that COULD be added to break this script
		*/
		
		new Function('WP_fetchMMToken', 'ssd', 'WebSocket', krunker)(new Promise((resolve, reject) => new constants.request('https://sys32.dev/api/v1/token').json().then(resolve).catch(reject)), cheat, class extends WebSocket {
			constructor(url, proto){
				super(url, proto);
				
				this.addEventListener('message', event => {
					// temp remove
					return;
					
					var decoded = msgpack.decode(new Uint8Array(event.data)), client;
					
					if(cheat.config.game.skins && decoded[0] == 0 && cheat.skin_cache && cheat.ws && (client = decoded[1].indexOf(cheat.ws.socketId || 0)) != -1){
						// loadout
						decoded[1][client + 12] = cheat.skin_cache[2];
						
						// hat
						decoded[1][client + 13] = cheat.skin_cache[3];
						
						// body
						decoded[1][client + 14] = cheat.skin_cache[4];
						
						// knife
						decoded[1][client + 19] = cheat.skin_cache[9];
						
						// dye
						decoded[1][client + 24] = cheat.skin_cache[14];
						
						// waist
						decoded[1][client + 33] = cheat.skin_cache[17];
						
						// event.data is non-writable but configurable
						Object.defineProperty(event, 'data', { value: msgpack.encode(decoded).buffer });
					}
				});
			}
			send(data){
				var decoded = msgpack.decode(data.slice(0, -2));
				
				if(decoded[0] == 'en')cheat.skin_cache = decoded[1];
				
				super.send(data);
			}
		});
	});
}))).observe(document, { childList: true, subtree: true });

cheat.input.main(cheat, add);
cheat.visual.main(cheat, add);

cheat.ctx = cheat.cas.getContext('2d', { alpha: true });

cheat.resize_cas();
window.addEventListener('resize', () => cheat.resize_cas());

cheat.process();

require('./update.js');

// window.cheat = cheat;