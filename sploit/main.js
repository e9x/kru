'use strict';
var Utils = require('./libs/utils'),
	Updater = require('./libs/updater'),
	Visual = require('./visual'),
	vars = require('./libs/vars'),
	integrate = require('./libs/integrate'),
	constants = require('./consts'),
	entries = require('./entries'),
	msgpack = require('msgpack-lite'),
	utils = new Utils(),
	updater = new Updater(constants.script, constants.extracted),
	UI = require('./libs/ui/'),
	cheat = require('./cheat'),
	input = require('./input'),
	visual = new Visual(),
	page_load = integrate.listen_load(() => {
		if(integrate.has_instruct('connection banned 0x2'))localStorage.removeItem('krunker_token'), UI.alert([
			`<p>You were IP banned, Sploit has signed you out.\nSpoof your IP to bypass this ban with one of the following:</p>`,
			`<ul>`,
				`<li>Using your mobile hotspot</li>`,
				...constants.proxy_addons.filter(data => data[constants.supported_store]).map(data => `<li><a target='_blank' href=${JSON.stringify(data[constants.supported_store])}>${data.name}</a></li>`),
				`<li>Use a <a target="_blank" href=${JSON.stringify(constants.addon_url('Proxy VPN'))}>Search for a VPN</a></li>`,
			`</ul>`,
		].join(''));
		else if(integrate.has_instruct('connection banned 0x1'))localStorage.removeItem('krunker_token'), UI.alert(
			`<p>You were banned, Sploit has signed you out.\nCreate a new account to bypass this ban.</p>`,
		);
		
		if(cheat.config.game.auto_respawn){
			if(integrate.has_instruct('connection error', 'game is full', 'kicked by vote', 'disconnected'))location.assign('https://krunker.io');
			else if(integrate.has_instruct('to play') && (!cheat.player || !cheat.player.active)){
				cheat.controls.locklessChange(true);
				cheat.controls.locklessChange(false);
			}
		}
	}),
	process = () => {
		try{
			if(cheat.player && cheat.player.process_inputs && !cheat.player.store.inputs_hooked){
				cheat.player.store.inputs_hooked = true;

				var process_inputs = cheat.player.process_inputs;
				
				cheat.player.process_inputs = (data, ...args) => {
					if(cheat.controls && cheat.player && cheat.player.weapon)input(data);
					
					return process_inputs.call(cheat.player.entity, data, ...args);
				};
			}
			
			visual.tick();
			
			if(cheat.config.game.overlay){
				visual.overlay();
			}
			
			if(cheat.config.aim.fov_box){
				visual.fov(cheat.config.aim.fov);
			}
			
			if(cheat.game && cheat.world)for(var ent of cheat.game.players.list){
				let player = cheat.add(ent);
				
				if(!player.active)continue;
				
				if(player.is_you)cheat.player = player;
				else player.tick();
				
				if(!player.frustum || player.is_you)continue;
				
				visual.cham(player);
				
				if(['box', 'box_chams', 'full'].includes(cheat.config.esp.status)){
					visual.box(player);
				}
				
				if(cheat.config.esp.status == 'full'){
					visual.health(player);
					visual.text(player);
				}
				
				if(cheat.config.esp.tracers){
					visual.tracer(player);
				}
				
				if(cheat.config.esp.labels){
					visual.label(player);
				}
			};
		}catch(err){
			constants.api.report_error('frame', err);
		}
		
		utils.request_frame(process);
	};

UI.ready.then(() => {
	constants.utils.canvas = UI.canvas;
	
	cheat.ui = new UI.Config(entries.ui(cheat));
	
	cheat.ui.update(true).then(() => {
		// migrate
		if(typeof cheat.config.aim.smooth == 'object')cheat.config.aim.smooth = cheat.config.aim.smooth.value;
		if(typeof cheat.config.esp.walls == 'object')cheat.config.esp.walls = 100;
		
		if(cheat.config.aim.target == 'feet')cheat.config.aim.target == 'legs';
		else if(cheat.config.aim.target == 'chest')cheat.config.aim.target == 'torso';
		
		var loading = new UI.Loading(cheat.config.game.custom_loading);
		
		loading.update();
		
		UI.panels.push(loading);
		
		utils.add_ele('div', loading.node);
		
		utils.add_ele('a', loading.node, { href: constants.discord, draggable: false});
		
		cheat.css_editor = new UI.Editor({
			tabs: cheat.config.game.css,
			store: constants.store,
			save(tabs){
				cheat.config.game.css = tabs;
				cheat.ui.config.save();
			},
		});
		
		constants.api.source().then(krunker => {
			process();
			
			krunker = vars.patch(krunker);
			
			constants.api.media('sploit',cheat,constants);
			
			var args = {
				[ vars.key ]: {
					three(three){ cheat.three = constants.utils.three = three },
					game(game){
						cheat.game = constants.utils.game = game;
						Object.defineProperty(game, 'controls', {
							configurable: true,
							set(value){
								// delete definition
								delete game.controls;
								
								return cheat.controls = game.controls = value;
							},
						});
					},
					socket(socket){ cheat.socket = socket },
					world(world){ cheat.world = constants.utils.world = world },
					can_see: inview => cheat.config.esp.status == 'full' ? false : (cheat.config.esp.nametags || inview),
					skins: ent => cheat.config.game.skins && typeof ent == 'object' && ent != null && ent.stats ? cheat.skins : ent.skins,
					input: input,
				},
				WebSocket: class extends WebSocket {
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
				},
				WP_fetchMMToken: constants.api.token(),
			};
			
			args.WP_fetchMMToken.then(() => {
				loading.hide();
			});
			
			page_load.then(async () => new Function(...Object.keys(args), krunker)(...Object.values(args)));
		});
	});
});

window.addEventListener('load', () => {
	updater.watch(() => {
		if(confirm('A new Sploit version is available, do you wish to update?'))updater.update();
	}, 60e3 * 3);	
});