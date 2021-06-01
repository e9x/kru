'use strict';
var Utils = require('./libs/utils'),
	Updater = require('./libs/updater'),
	Visual = require('./visual'),
	Input = require('./input'),
	UI = require('./libs/ui/'),
	Socket = require('./socket'),
	vars = require('./libs/vars'),
	integrate = require('./libs/integrate'),
	constants = require('./consts'),
	entries = require('./entries'),
	utils = new Utils(),
	updater = new Updater(constants.script, constants.extracted),
	input = new Input(),
	visual = new Visual(),
	cheat = constants.cheat,
	api = constants.api,
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
			visual.tick();
			
			// visual.crosshair();
			
			if(cheat.config.game.overlay)visual.overlay();
			
			if(cheat.config.aim.fov_box)visual.fov(cheat.config.aim.fov);
			
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
			api.report_error('frame', err);
		}
		
		utils.request_frame(process);
	},
	source = api.source(),
	token = api.token();

UI.ready.then(() => {
	constants.utils.canvas = UI.canvas;
	
	cheat.ui = new UI.Config(entries.ui);
	
	cheat.ui.update(true).then(async () => {
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
		
		process();
		
		var krunker = vars.patch(await source);
		
		api.media('sploit',cheat,constants);
		
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
				input: input.push.bind(input),
			},
			WebSocket: Socket,
			WP_fetchMMToken: token,
		};
		
		args.WP_fetchMMToken.then(() => {
			loading.hide();
		});
		
		page_load.then(async () => new Function(...Object.keys(args), krunker)(...Object.values(args)));
	});
});

// alerts shown prior to the window load event are cancelled

window.addEventListener('load', () => {
	updater.watch(() => {
		if(confirm('A new Sploit version is available, do you wish to update?'))updater.update();
	}, 60e3 * 3);	
});