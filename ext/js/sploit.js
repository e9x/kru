'use strict';
var add = Symbol(),
	manifest = require('../manifest.json'),
	cheat = parent.cheat = {
		add: add,
		assign_deep: (e,...a)=>(a.forEach(a=>Object.keys(a).forEach(r=>typeof a[r]=='object'&&!Array.isArray(a[r])&&r in e?cheat.assign_deep(e[r],a[r]):e[r]=a[r])),e),
		wf: check => new Promise((resolve, reject, interval) => (interval = setInterval(() => {
			var checked = check();
			
			if(checked)clearInterval(interval); else return;
			
			resolve(checked);
			interval = null;
		}, 15))),
		syms: new Proxy({}, {
			get(target, prop){
				if(!target[prop])target[prop] = Symbol();
				
				return target[prop];
			}
		}),
		rnds: new Proxy({}, {
			get(target, prop){
				if(!target[prop])target[prop] = [...Array(16)].map(() => Math.random().toString(36)[2]).join('').replace(/(\d|\s)/, 'V').toLowerCase().substr(0, 6);
				
				return target[prop];
			}
		}),
		objs: new Proxy({}, {
			get(target, prop){
				if(!target[prop])target[prop] = cheat.object_list[~~(Math.random() * cheat.object_list.length)];
				
				return target[prop];
			}
		}),
		materials_esp: new Proxy({}, {
			get(target, prop){
				if(!target[prop])target[prop] = new cheat.three.MeshBasicMaterial({
					transparent: true,
					fog: false,
					depthTest: false,
					color: prop,
				});
				
				return target[prop];
			},
		}),
		three: require('./three.js'),
		object_list: Object.getOwnPropertyNames(window).filter(key => !(/webkit/gi.test(key)) && typeof window[key] == 'function' && String(window[key]) == 'function ' + key + '() { [native code] }' && Object.isExtensible(window[key]) && Object.getOwnPropertyDescriptor(window, key).configurable),
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
				proxy: false,
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
			['recoilAnimY', /this\.reward=0,this\.\w+=0,this\.(\w+)=0,this\.\w+=0,this\.\w+=1,this\.slideLegV/, 1],
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
			
			
			// [/([\w\.])\.skins(?!=)/g, 'ssd.skin($1)'],
		],
		storage: {
			skins: [...new Uint8Array(5e3)].map((e, i) => ({ ind: i, cnt: 1 })),
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
				return cheat.config.game.skins ? Object.assign(cheat.storage.skins, player.skins) : player.skins;
			},
			frame(frame, func){
				cheat.player = cheat.game ? cheat.game.players.list.find(player => player[cheat.vars.isYou]) : null;
				cheat.controls = cheat.game ? cheat.game.controls : null;
				
				if(cheat.player && cheat.player[cheat.vars.procInputs] && !cheat.player[cheat.syms.procInputs]){
					cheat.player[cheat.syms.procInputs] = cheat.player[cheat.vars.procInputs];
					
					cheat.player[cheat.vars.procInputs] = cheat.procInputs;
				}
				
				if(cheat.world)cheat.world.scene.onBeforeRender = cheat.process;
				
				if(cheat.ws && !cheat.ws[cheat.syms.hooked] && cheat.ws.send){
					cheat.ws[cheat.syms.hooked] = true;
					
					var osend = cheat.ws.send.bind(cheat.ws),
						odispatch = cheat.ws._dispatchEvent.bind(cheat.ws);

					cheat.ws.send = (label, ...data) => {
						if(label == 'en' && cheat.config.game.skins)cheat.skin_conf = {
							weapon: data[0][2],
							hat: data[0][3],
							body: data[0][4],
							knife: data[0][9],
							dye: data[0][14],
							waist: data[0][17],
						};
						
						return osend(label, ...data);
					}
					
					cheat.ws._dispatchEvent = (label, data) => {
						var pd = data[0], player_size = 38;
						
						if(cheat.config.game.skins && label[0] == 0 && cheat.skin_conf){
							for(;pd.length % player_size != 0;)player_size++;
							
							for(var i = 0; i < pd.length; i += player_size)if(pd[i] == cheat.ws.socketId){
								pd[i + 12] = cheat.skin_conf.weapon;
								pd[i + 13] = cheat.skin_conf.hat;
								pd[i + 14] = cheat.skin_conf.body;
								pd[i + 19] = cheat.skin_conf.knife;
								pd[i + 25] = cheat.skin_conf.dye;
								pd[i + 33] = cheat.skin_conf.waist;
							}
						}
						
						data[0] = pd;
						
						return odispatch(label, data);
					}
				}
				
				/*if(cheat.controls && !cheat.controls[cheat.syms.hooked]){
					cheat.controls[cheat.syms.hooked] = true;
					
					var camChaseSpd = 0.0012, target;
					
					if(cheat.gconfig)Object.defineProperty(cheat.gconfig, cheat.vars.camChaseSpd, {
						get: _ => cheat.moving_camera ? ((50 - cheat.config.aim.smooth.value) / 5000) : camChaseSpd,
						set: v => camChaseSpd = v,
					});
					
					Object.defineProperty(cheat.controls, 'target', {
						get: _ => cheat.moving_camera ? cheat.moving_camera : target,
						set: v => target = v,
					});
				}*/
				
				cheat.visual(cheat);
				
				return Reflect.apply(frame, parent, [ func ]);
			},
		},
		dist_center(pos){
			return Math.hypot((parent.innerWidth / 2) - pos.x, (parent.innerHeight / 2) - pos.y);
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
		procInputs(data, ...args){
			if(!cheat.controls || !cheat.player || !cheat.player[add])return;
			
			cheat.input(cheat, data);
			
			return this[cheat.syms.procInputs](data, ...args);
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
			
			ent[add].obj = ent && ent.lowerBody && ent.lowerBody.parent && ent.lowerBody.parent ? ent.lowerBody.parent.parent : null;
			
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
			if(!cheat.game || !cheat.controls || !cheat.world || !cheat.player)return;
			
			cheat.game.players.list.forEach(cheat.ent_vals);
		},
		// axis
		v3: ['x', 'y', 'z'],
		round: (n, r) => Math.round(n * Math.pow(10, r)) / Math.pow(10, r),
		ctr(label, args = []){ // ctx raw
			if(!cheat.ctx)return;
			
			return Reflect.apply(CanvasRenderingContext2D.prototype[label], cheat.ctx, args);
		},
		input: require('./input.js'),
		has_instruct: (str, inst) => (inst = parent.document.querySelector('#instructionHolder'), inst && inst.textContent.trim().toLowerCase().includes(str)),
		process_interval: setInterval(() => {
			// automatic stuff
			
			if(cheat.config.game.auto_respawn){
				if(cheat.has_instruct('connection banned'))clearInterval(cheat.process_interval), cheat.config.game.proxy = true, cheat.ui.data.config.save(), parent.location.assign('https://krunker.io');
				else if(cheat.has_instruct('game is full'))clearInterval(cheat.process_interval), parent.location.assign('https://krunker.io');
				else if(cheat.has_instruct('disconnected'))clearInterval(cheat.process_interval), parent.location.assign('https://krunker.io');
				else if(cheat.has_instruct('click to play') && (!cheat.player || !cheat.player[cheat.add] || !cheat.player[cheat.add].active || !cheat.player[cheat.add].health))cheat.controls.toggle(true);
			}
		}, 100),
		api: 'https://api.brownstation.pw/',
	};

cheat.util.cheat = cheat;
cheat.raycaster = new cheat.three.Raycaster();

cheat.ui = new (require('./ui.js').init)({
	title: 'Shitsploit',
	footer: 'Press [F1] or [C] to toggle menu',
	config: {
		key: 'krk_custcSops',
		save(){
			parent.localStorage.setItem(this.key, JSON.stringify(cheat.config));
		},
		load(){
			cheat.assign_deep(cheat.config, JSON.parse(parent.localStorage.getItem(this.key) || '{}'));
		},
	},
	values: [{
		name: 'Main',
		contents: [{
			name: 'Auto aim',
			type: 'bool_rot',
			get: _ => cheat.config.aim.status,
			set: v => cheat.config.aim.status = v,
			vals: [{
				val: 'off',
				display: 'Off',
			},{
				val: 'triggerbot',
				display: 'Triggerbot',
			},{
				val: 'assist',
				display: 'Assist',
			},{
				val: 'silent',
				display: 'Silent',
			}],
			key: 3,
		},{
			name: 'Auto bhop',
			type: 'bool_rot',
			get: _ => cheat.config.game.bhop,
			set: v => cheat.config.game.bhop = v,
			vals: [{
				val: 'off',
				display: 'Off',
			},{
				val: 'keyjump',
				display: 'Key jump',
			},{
				val: 'keyslide',
				display: 'Key slide',
			},{
				val: 'autoslide',
				display: 'Auto slide',
			},{
				val: 'autojump',
				display: 'Auto jump',
			}],
			key: 4,
		},{
			name: 'ESP mode',
			type: 'bool_rot',
			get: _ => cheat.config.esp.status,
			set: v => cheat.config.esp.status = v,
			vals: [{
				val: 'off',
				display: 'Off',
			},{
				val: 'box',
				display: 'Box',
			},{
				val: 'chams',
				display: 'Chams',
			},{
				val: 'box_chams',
				display: 'Box & chams',
			},{
				val: 'full',
				display: 'Full',
			}],
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
			name: 'You need to be signed in for the skin hack',
			type: 'text-small',
		},{
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
		},{
			name: 'Anti IP Ban',
			type: 'bool',
			get: _ => cheat.config.game.proxy,
			set: v => cheat.config.game.proxy = v,
			key: 'unset',
		}],
	},{
		name: 'Aim',
		contents: [{
			name: 'Target sorting',
			type: 'bool_rot',
			get: _ => cheat.config.game.target_sorting,
			set: v => cheat.config.game.target_sorting = v,
			vals: [{
				val: 'dist2d',
				display: 'Distance (2D)',
			},{
				val: 'dist3d',
				display: 'Distance (3D)',
			},{
				val: 'hp',
				display: 'Health',
			}],
			key: 'unset',
		},{
			name: 'Smoothness',
			type: 'slider',
			get: _ => cheat.config.aim.smooth.value,
			set: v => cheat.config.aim.smooth.value = v,
			min_val: 0,
			max_val: 50,
			unit: 10,
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
			min_val: 0.1,
			max_val: 1,
			unit: 1,
		}]
	},{
		name: 'Settings',
		contents: [{
			name: 'Join the Discord',
			type: 'function_inline',
			key: 'unset',
			val: () => window.open('https://e9x.github.io/kru/inv/'),
		}],
	}],
});

parent.fetch = (url, opts) => new Promise((resolve, reject) => { throw new TypeError('Failed to fetch') });

cheat.wf(() => parent.zip).then(() => fetch(new URL('/token', cheat.api)).then(res => res.json()).then(data => fetch(new URL('/data/game.' + data.build + '.js', cheat.api)).then(res => res.text()).then(vries => {
	cheat.patches.forEach(([ regex, replace ]) => vries = vries.replace(regex, replace));
	cheat.find_vars.forEach(([ name, regex, index ]) => cheat.vars[name] = (vries.match(regex)||[])[index]);
	
	var args = {
		ssd: cheat.storage,
		fetch: fetch,
		WebSocket: cheat.config.game.proxy ? class extends WebSocket {
			constructor(url, opts){
				super('wss://krunker.space/c5580cf2af/ws', encodeURIComponent(btoa(url)));
			}
		} : WebSocket,
		Proxy: function(input){
			return input;
		},
		localStorage: new Proxy(parent.localStorage, {
			get(target, prop){
				var ret = Reflect.get(target, prop);
				
				return typeof ret == 'function' ? ret.bind(target) : target.getItem.call(target, prop);
			},
			set(target, prop, value){
				var ret = Reflect.get(target, prop);
				
				return typeof ret == 'function' ? ret.bind(target) : target.setItem.call(target, prop, value);
			},
		}),
		WP_fetchMMToken: new Promise(r => r(data.token)),
	};
	
	
	parent.Storage.prototype.getItem = new Proxy(parent.Storage.prototype.getItem, {
		apply: (target, that, [ prop ]) => prop == cheat.ui.data.config.key ? cheat.key_test : Reflect.apply(target, that, [ prop ]),
	});
	
	parent.Storage.prototype.setItem = new Proxy(parent.Storage.prototype.setItem, {
		apply: (target, that, [ prop, value ]) => prop == cheat.ui.data.config.key ? (cheat.key_test = value, undefined) : Reflect.apply(target, that, [ prop, value ]),
	});
	
	cheat.wf(() => document.readyState == 'complete').then(() => new parent.Function(...Object.keys(args), vries)(...Object.values(args)));
})));

/*
if(module.userscript){ // running in tampermonkey
	cheat.check_for_updates();
	
	setInterval(cheat.check_for_updates, cheat.updates.update_interval);
}

if(typeof nrequire == 'function'){ // in client
	// var fs = nrequire('fs');
	
	// todo: integrate with client further
}
*/

parent.AudioParam.prototype.setTargetAtTime = function(...args){
	try{ Reflect.apply(AudioParam.prototype.setTargetAtTime, this, args) }catch(err){}
	
	return this;
}