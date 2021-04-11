'use strict';

if(typeof GM_getValue == 'undefined'){
	var GM_getValue = key => localStorage.getItem('ss' + key), GM_setValue = (key, val) => localStorage.setItem('ss' + key, val);
}

var add = Symbol(),
	spackage = require('../package.json'),
	msgpack = require('msgpack-lite'),
	cheat = {
		add: add,
		assign_deep: (e,...a)=>(a.forEach(a=>Object.keys(a).forEach(r=>typeof a[r]=='object'&&!Array.isArray(a[r])&&r in e?cheat.assign_deep(e[r],a[r]):e[r]=a[r])),e),
		syms: new Proxy({}, {
			get(target, prop){
				if(!target[prop])target[prop] = Symbol();
				
				return target[prop];
			}
		}),
		three: require('three'),
		log(...args){
			console.log('%cShitsploit', 'background: #27F; color: white; border-radius: 3px; padding: 3px 2px; font-weight: 600', ...args);
			
			return true;
		},
		err(...args){
			console.error('%cShitsploit', 'background: #F22; color: white; border-radius: 3px; padding: 3px 2px; font-weight: 600', '\n', ...args);
			
			return true;
		},
		config: {
			aim: {
				status: 'off',
				smooth: {
					status: false,
					value: 25,
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
			},
		},
		util: require('./util.js'),
		vars: {},
		vars_not_found: [],
		find_vars: [
			['isYou', /this\.accid=0,this\.(\w+)=\w+,this\.isPlayer/, 1],
			['inView', /&&!\w\.\w+&&\w\.\w+&&\w\.(\w+)\){/, 1],
			['pchObjc', /0,this\.(\w+)=new \w+\.Object3D,this/, 1],
			['aimVal', /this\.(\w+)-=1\/\(this\.weapon\.aimSpd/, 1],
			['crouchVal', /this\.(\w+)\+=\w\.crouchSpd\*\w+,1<=this\.\w+/, 1],
			['didShoot', /--,\w+\.(\w+)=!0/, 1],
			['ammos', /length;for\(\w+=0;\w+<\w+\.(\w+)\.length/, 1],
			['weaponIndex', /\.weaponConfig\[\w+]\.secondary&&\(\w+\.(\w+)==\w+/, 1],
			['maxHealth', /\.regenDelay,this\.(\w+)=\w+\.mode&&\w+\.mode\.\1/, 1],
			['yVel', /\w+\.(\w+)&&\(\w+\.y\+=\w+\.\1\*/, 1],
			['mouseDownR', /this\.(\w+)=0,this\.keys=/, 1], 
			['recoilAnimY', /\.\w+=0,this\.(\w+)=0,this\.\w+=0,this\.\w+=1,this\.slide/, 1],
			['procInputs', /this\.(\w+)=function\(\w+,\w+,\w+,\w+\){this\.recon/, 1],
		],
		patches: [
			// get vars
			[/this\.moveObj=func/, 'ssd.game = this, $&'],
			[/this\.backgroundScene=/, 'ssd.world = this, $&'],
			
			// hijack rendering
			[/requestAnimFrame(F|)\(/g, 'ssd.frame(requestAnimFrame$1, '],
			
			// get webpack modules
			[/(\w)\(\1\.\w=\d+\)/, '$&; ssd.mod($1)'],
			
			
			[/((?:[a-zA-Z]+(\.|(?=\.skins)))+)\.skins(?!=)/g, 'ssd.skin($1)'],
		],
		storage: {
			skins: [...Array(5000)].map((e, i) => ({ ind: i, cnt: 1 })),
			get config(){ return cheat.config },
			get player(){ return cheat.player || { weapon: {} } },
			get target(){ return cheat.target || {} },
			mod(__webpack_require__){
				var vals = Object.values(__webpack_require__.c);
				
				Object.entries({
					ws: [ 'connected', 'send', 'trackPacketStats' ],
				}).forEach(([ label, entries ]) => vals.forEach(mod => !entries.some(entry => !Reflect.apply(Object.prototype.hasOwnProperty, mod.exports, [ entry ])) && (cheat[label] = mod.exports)));
			},
			set game(nv){
				cheat.game = nv;
			},
			set world(nv){
				cheat.world = nv;
			},
			skin(player){
				return cheat.config.game.skins && player && player.alias ? cheat.storage.skins : player.skins;
			},
			frame(frame, func){
				cheat.player = cheat.game ? cheat.game.players.list.find(player => player[cheat.vars.isYou]) : null;
				cheat.controls = cheat.game ? cheat.game.controls : null;
				
				if(cheat.player && cheat.player[cheat.vars.procInputs] && !cheat.player[cheat.syms.procInputs]){
					cheat.player[cheat.syms.procInputs] = cheat.player[cheat.vars.procInputs];
					
					cheat.player[cheat.vars.procInputs] = (data, ...args) => {
						if(cheat.controls && cheat.player && cheat.player[add] && cheat.player.weapon)cheat.input(cheat, data);
						
						return cheat.player[cheat.syms.procInputs](data, ...args);
					};
				}
				
				cheat.visual(cheat);
				
				return frame(func);
			},
		},
		dist_center(pos){
			return Math.hypot((innerWidth / 2) - pos.x, (innerHeight / 2) - pos.y);
		},
		sorts: {
			//  * (ent_1[add].frustum == ent_2[add].frustum ? 1 : 0.5);
			dist3d(ent_1, ent_2){
				return ent_1[add].pos.distanceTo(ent_2);
			},
			dist2d(ent_1, ent_2){
				return (ent_1, ent_2) => dist_center(ent_2[add].pos2D) - dist_center(ent_1[add].pos2D);
			},
			hp(ent_1, ent_2){
				return ent_1.health - ent_2.health;
			},
			norm(ent_1, ent_2){
				return cheat.sorts[cheat.config.aim.target_sorting || 'dist2d'](ent_1, ent_2) * (ent_1[add].frustum == ent_2[add].frustum ? 1 : 0.5);
			},
		},
		ent_pos: {
			distanceTo(p2){return Math.hypot(this.x - p2.x, this.y - p2.y, this.z - p2.z)},
			project(t){ return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)},
			applyMatrix4(t){var e=this.x,n=this.y,r=this.z,i=t.elements,a=1/(i[3]*e+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*e+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*e+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*e+i[6]*n+i[10]*r+i[14])*a,this},
		},
		ent_vals(ent){
			if(!ent[add]){
				ent[add] = {
					pos: Object.assign({}, cheat.ent_pos),
				};
			}
			
			ent[add].risk = ent.isDev || ent.isMod || ent.isMapMod || ent.canGlobalKick || ent.canViewReports || ent.partnerApp || ent.canVerify || ent.canTeleport || ent.isKPDMode || ent.level >= 30;
			
			ent[add].is_you = ent[cheat.vars.isYou];
			
			ent[add].pos.x = ent.x || 0;
			ent[add].pos.y = ent.y || 0;
			ent[add].pos.z = ent.z || 0;
			
			ent[add].aiming = !ent[cheat.vars.aimVal] || ent.weapon.noAim || cheat.target && cheat.target[add] && ent.weapon.melee && ent[add].pos.distanceTo(cheat.target[add].pos) <= 18;
			
			ent[add].crouch = ent[cheat.vars.crouchVal];
			
			ent[add].obj = ent && ent.lowerBody && ent.lowerBody.parent && ent.lowerBody.parent ? ent.lowerBody.parent : null;
			
			ent[add].health = ent.health;
			ent[add].max_health = ent[cheat.vars.maxHealth];
			ent[add].pos2D = ent.x != null ? cheat.util.pos2d(ent[add].pos) : { x: 0, y: 0 };
			ent[add].canSee = ent[add].active && cheat.util.can_see(cheat.player, ent) == null ? true : false;
			
			ent[add].frustum = cheat.util.frustum(cheat.world.frustum, ent[add].pos);
			
			ent[add].active = ent && ent.x != null && ent[add].obj && cheat.ctx && ent.health &&ent.health > 0;
			ent[add].enemy = !ent.team || ent.team != cheat.player.team;
			ent[add].did_shoot = ent[cheat.vars.didShoot];
			
			ent[add].shot = cheat.player.weapon.nAuto && cheat.player[cheat.vars.didShoot];
			
			if(ent[add].active){
				if(ent[add].obj)ent[add].obj.visible = true;
				
				var normal = ent[cheat.vars.inView];
				
				ent[cheat.vars.inView] = cheat.hide_nametags ? false : cheat.config.esp.nametags || normal;
			}
		},
		draw_text(lines, text_x, text_y, font_size){
			for(var text_index = 0; text_index < lines.length; text_index++){
				var line = lines[text_index],
					xoffset = 0,
					color,
					text,
					text_args;
				
				for(var sub_ind = 0; sub_ind < line.length; sub_ind++){
					// if(!line[sub_ind])continue;
					
					color = line[sub_ind][0];
					text = line[sub_ind][1];
					text_args = [ text, text_x + xoffset, text_y + text_index * (font_size + 2) ];
					
					cheat.ctx.fillStyle = color;
					
					cheat.ctr('strokeText', text_args);
					cheat.ctr('fillText', text_args);
					
					xoffset += cheat.ctr('measureText', [ text ]).width + 2;
				}
			}
		},
		visual: require('./visual.js'),
		process(){
			if(cheat.game && cheat.controls && cheat.world && cheat.player){
				cheat.game.players.list.forEach(cheat.ent_vals);
			}
			
			requestAnimationFrame(cheat.process);
		},
		// axis
		v3: ['x', 'y', 'z'],
		round: (n, r) => Math.round(n * Math.pow(10, r)) / Math.pow(10, r),
		ctr(label, args = []){ // ctx raw
			if(!cheat.ctx)return;
			
			return Reflect.apply(CanvasRenderingContext2D.prototype[label], cheat.ctx, args);
		},
		input: require('./input.js'),
		has_instruct: (str, inst) => (inst = document.querySelector('#instructionHolder'), inst && inst.textContent.trim().toLowerCase().includes(str)),
		process_interval: setInterval(() => {
			// automatic stuff
			
			if(cheat.config.game.auto_respawn){
				if(cheat.has_instruct('game is full'))clearInterval(cheat.process_interval), location.assign('https://krunker.io');
				else if(cheat.has_instruct('disconnected'))clearInterval(cheat.process_interval), location.assign('https://krunker.io');
				else if(cheat.has_instruct('click to play') && (!cheat.player || !cheat.player[cheat.add] || !cheat.player[cheat.add].active || !cheat.player[cheat.add].health))cheat.controls.toggle(true);
			}
		}, 100),
	};

cheat.util.cheat = cheat;
cheat.raycaster = new cheat.three.Raycaster();
cheat.process();

cheat.ui = new (require('./ui.js').init)({
	version: spackage.version,
	title: 'Shitsploit',
	footer: 'Press [F1] or [C] to toggle',
	toggle: ['KeyC', 'F1'],
	config: {
		save: () => GM_setValue('config', JSON.stringify(cheat.config)),
		async load(){
			return cheat.assign_deep(cheat.config, JSON.parse(await GM_getValue('config') || '{}'));
		},
	},
	values: [{
		name: 'Main',
		contents: [{
			name: 'Auto aim',
			type: 'bool_rot',
			get: _ => cheat.config.aim.status,
			set: v => cheat.config.aim.status = v,
			vals: [
				[ 'off', 'Off' ],
				[ 'triggerbot', 'Triggerbot' ],
				[ 'assist', 'Assist' ],
				[ 'silent', 'Silent' ],
				[ 'hidden', 'Hidden' ],
			],
			key: 3,
		},{
			name: 'Auto bhop',
			type: 'bool_rot',
			get: _ => cheat.config.game.bhop,
			set: v => cheat.config.game.bhop = v,
			vals: [
				[ 'off', 'Off' ],
				[ 'keyjump', 'Key jump' ],
				[ 'keyslide', 'Key slide' ],
				[ 'autoslide', 'Auto slide' ],
				[ 'off', 'Off' ],
				[ 'autojump', 'Auto jump' ],
			],
			key: 4,
		},{
			name: 'ESP mode',
			type: 'bool_rot',
			get: _ => cheat.config.esp.status,
			set: v => cheat.config.esp.status = v,
			vals: [
				[ 'off', 'Off' ],
				[ 'box', 'Box' ],
				[ 'chams', 'Chams' ],
				[ 'box_chams', 'Box & chams' ],
				[ 'full', 'Full' ],
			],
			key: 5,
		},{
			name: 'Tracers',
			type: 'bool',
			get: _ => cheat.config.esp.tracers,
			set: v => cheat.config.esp.tracers = v,
			key: 6,
		},{
			name: 'Nametags',
			type: 'bool',
			get: _ => cheat.config.esp.nametags,
			set: v => cheat.config.esp.nametags = v,
			key: 7,
		},{
			name: 'Overlay',
			type: 'bool',
			get: _ => cheat.config.game.overlay,
			set: v => cheat.config.game.overlay = v,
			key: 8,
		}],
	},{
		name: 'Game',
		contents: [{
			name: 'Skins',
			type: 'bool',
			get: _ => cheat.config.game.skins,
			set: v => cheat.config.game.skins = v,
			key: 'unset',
		},{
			name: 'Wireframe',
			type: 'bool',
			get: _ => cheat.config.game.wireframe,
			set: v => cheat.config.game.wireframe = v,
			key: 'unset',
		},{
			name: 'Auto respawn',
			type: 'bool',
			get: _ => cheat.config.game.auto_respawn,
			set: v => cheat.config.game.auto_respawn = v,
			key: 'unset',
		}],
	},{
		name: 'Aim',
		contents: [{
			name: 'Target sorting',
			type: 'bool_rot',
			get: _ => cheat.config.game.target_sorting,
			set: v => cheat.config.game.target_sorting = v,
			vals: [
				[ 'dist2d', 'Distance (2D)' ],
				[ 'dist3d', 'Distance (3D)' ],
				[ 'hp', 'Health' ],
			],
			key: 'unset',
		},{
			name: 'Smoothness',
			type: 'slider',
			get: _ => cheat.config.aim.smooth.value,
			set: v => cheat.config.aim.smooth.value = v,
			range: [ 5, 50 ],
		},{
			name: 'Smooth',
			type: 'bool',
			get: _ => cheat.config.aim.smooth.status,
			set: v => cheat.config.aim.smooth.status = v,
			key: 'unset',
		},{
			name: 'Auto reload',
			type: 'bool',
			get: _ => cheat.config.aim.auto_reload,
			set: v => cheat.config.aim.auto_reload = v,
			key: 'unset',
		},{
			name: 'Sight check',
			type: 'bool',
			get: _ => cheat.config.aim.sight,
			set: v => cheat.config.aim.sight = v,
			key: 'unset',
		},{
			name: 'Wallbangs',
			type: 'bool',
			get: _ => cheat.config.aim.wallbangs,
			set: v => cheat.config.aim.wallbangs = v,
			key: 'unset',
		}],
	},{
		name: 'Esp',
		contents: [{
			name: 'Minimap',
			type: 'bool',
			get: _ => cheat.config.esp.minimap,
			set: v => cheat.config.esp.minimap = v,
			key: 'unset',
		},{
			name: 'Walls',
			type: 'bool',
			get: _ => cheat.config.esp.walls.status,
			set: v => cheat.config.esp.walls.status = v,
			key: 'unset',
		},{
			name: 'Wall opacity',
			type: 'slider',
			get: _ => cheat.config.esp.walls.value,
			set: v => cheat.config.esp.walls.value = v,
			range: [ 0.1, 1 ],
		}]
	},{
		name: 'Settings',
		contents: [{
			name: 'Join the Discord',
			type: 'function_inline',
			key: 'unset',
			val: () => window.open('https://e9x.github.io/kru/invite'),
		}],
	}],
});

new MutationObserver((muts, observer) => muts.forEach(mut => [...mut.addedNodes].forEach(node => {
	if(!(node instanceof HTMLScriptElement) || !node.textContent.includes('Yendis Entertainment'))return;
	
	observer.disconnect();
	node.remove();
	
	fetch('https://api.sys32.dev/latest.js').then(res => res.text()).then(vries => {
		// find variables
		cheat.find_vars.forEach(([ name, regex, index ]) => cheat.vars[name] = (vries.match(regex) || 0)[index] || console.error('Could not find', name, regex, 'at index', index));
		
		// apply patches
		cheat.patches.forEach(([ regex, replace ]) => vries = vries.replace(regex, replace));
		
		new Function('ssd', 'WebSocket', vries)(cheat.storage, class extends WebSocket {
			constructor(url, proto){
				super(url, proto);
				
				this.addEventListener('message', event => {
					var decoded = msgpack.decode(new Uint8Array(event.data)), start_client;
					
					if(cheat.config.game.skins && decoded[0] == 0 && cheat.skin_cache && cheat.ws && (start_client = decoded[1].indexOf(cheat.ws.socketId || 0)) != -1){
						var player = decoded[1].slice(start_client);
						
						player[12] = cheat.skin_cache.loadout;
						player[13] = cheat.skin_cache.hat;
						player[14] = cheat.skin_cache.body;
						player[19] = cheat.skin_cache.knife;
						player[24] = cheat.skin_cache.dye;
						player[33] = cheat.skin_cache.waist;
						
						decoded[1] = decoded[1].slice(0, start_client).concat(player);
						
						var buf = msgpack.encode(decoded).buffer;
						
						Object.defineProperty(event, 'data', { get: _ => buf });
					}
				});
			}
			send(data){
				var decoded;
				
				if((decoded = msgpack.decode(data.slice(0, -2)))[0] == 'en')cheat.skin_cache = {
					loadout: decoded[1][2],
					hat: decoded[1][3],
					body: decoded[1][4],
					knife: decoded[1][9],
					dye: decoded[1][14],
					waist: decoded[1][17],
				};
				
				super.send(data);
			}
		});
	});
}))).observe(document, { childList: true, subtree: true });

require('./update.js');