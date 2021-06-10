'use strict';

var Visual = require('./visual'),
	Input = /*require('../../privatepatch')*/require('./input'),
	UI = require('./libs/ui/'),
	Socket = require('./socket'),
	vars = require('./libs/vars'),
	entries = require('./entries'),
	input = new Input(),
	visual = new Visual(),
	{ utils, proxy_addons, supported_store, addon_url, meta, cheat, api, store } = require('./consts'),
	process = () => {
		try{
			visual.tick();
			
			if(cheat.config.game.overlay)visual.overlay();
			
			if(cheat.config.aim.fov_box)visual.fov(cheat.config.aim.fov);
			
			if(cheat.game && cheat.world)for(var ent of cheat.game.players.list){
				let player = cheat.add(ent);
				
				if(!player.active)continue;
				
				if(player.is_you)cheat.player = player;
				else player.tick();
				
				if(!player.frustum || player.is_you)continue;
				
				visual.cham(player);
				
				if(['box', 'box_chams', 'full'].includes(cheat.config.esp.status))visual.box(player);
				
				if(cheat.config.esp.status == 'full'){
					visual.health(player);
					visual.text(player);
				}
				
				if(cheat.config.esp.tracers)visual.tracer(player);
				
				if(cheat.config.esp.labels)visual.label(player);
			};
		}catch(err){
			api.report_error('frame', err);
		}
		
		utils.request_frame(process);
	},
	source = api.source(),
	token = api.token();

api.on_instruct = () => {
	if(api.has_instruct('connection banned 0x2'))localStorage.removeItem('krunker_token'), UI.alert([
		`<p>You were IP banned, Sploit has signed you out.\nSpoof your IP to bypass this ban with one of the following:</p>`,
		`<ul>`,
			`<li>Using your mobile hotspot</li>`,
			...proxy_addons.filter(data => data[supported_store]).map(data => `<li><a target='_blank' href=${JSON.stringify(data[supported_store])}>${data.name}</a></li>`),
			`<li>Use a <a target="_blank" href=${JSON.stringify(addon_url('Proxy VPN'))}>Search for a VPN</a></li>`,
		`</ul>`,
	].join(''));
	else if(api.has_instruct('banned'))localStorage.removeItem('krunker_token'), UI.alert(
		`<p>You were banned, Sploit has signed you out.\nCreate a new account to bypass this ban.</p>`,
	);
	
	if(cheat.config.game.auto_respawn){
		if(api.has_instruct('connection error', 'game is full', 'kicked by vote', 'disconnected'))location.assign('https://krunker.io');
		else if(api.has_instruct('to play') && (!cheat.player || !cheat.player.active)){
			cheat.controls.locklessChange(true);
			cheat.controls.locklessChange(false);
		}
	}
};

UI.ready.then(() => {
	utils.canvas = UI.canvas;
	
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
		
		utils.add_ele('a', loading.node, { href: meta.discord, draggable: false});
		
		cheat.css_editor = new UI.Editor({
			tabs: cheat.config.game.css,
			store: store,
			save(tabs){
				cheat.config.game.css = tabs;
				cheat.ui.config.save();
			},
			help: [
				`<h3>Glossary:</h3><ul>`,
					`<li>Menu bar - set of buttons found in the top left of the panel.</li>`,
				`</ul>`,
				`<h3>What does this menu do?</h3>`,
				`<p>This is a CSS manager/ide for Krunker.</p>`,
				`<h3>How do I add my CSS?</h3>`,
				`<p>1. Press the svg.web button found in the menu bar.</p>`,
				`<p>2. In the new window, input the link to your CSS then press OK.</p>`,
				`<p>3. Reload by pressing the svg.reload button in the menu bar.</p>`,
				`<h3>How do I manually add CSS?</h3>`,
				`<p>1. Create a new file with the svg.add_file button found in the top right of the CSS manager.<p>`,
				`<p>2. In the text editor, input your CSS.<p>`,
				`<p>3. When you are finished, press the svg.save button to save changes.<p>`,
				`<p>4. Reload by pressing the svg.reload button in the menu bar.</p>`,
				'<h3>How do I turn on/off my CSS?</h3>',
				`<p>Pressing the square icon in your CSS's tab will toggle the visibility. When the square is filled, the tab is enabled, when the square is empty, the tab is disabled.<p>`,
				'<h3>How do I rename my CSS?</h3>',
				`<p>Pressing the svg.rename icon in your CSS's tab will change the tab to renaming mode. Type in the new name then press enter to save changes.<p>`,
				'<h3>How do I remove my CSS?</h3>',
				`<p>Pressing the svg.close icon in your CSS's tab will remove your CSS.<p>`,
				`<p>For further help, search or post on the forum found by <a target="_blank" href="${meta.forum}">clicking here</a>.<p>`,
			].join(''),
		});
		
		process();
		
		token.finally(() => loading.hide());
		
		var krunker = vars.patch(await source);
		
		var args = {
			[ vars.key ]: {
				three(three){ utils.three = three },
				game(game){
					cheat.game = utils.game = game;
					Object.defineProperty(game, 'controls', {
						configurable: true,
						set(controls){
							// delete definition
							delete game.controls;
							
							var timer = 0;
							
							Object.defineProperty(controls, 'idleTimer', {
								get: _ => cheat.config.game.inactivity ? 0 : timer,
								set: value => timer = value,
							});
							
							return cheat.controls = game.controls = controls;
						},
					});
				},
				socket(socket){ cheat.socket = socket },
				world(world){ cheat.world = utils.world = world },
				can_see: inview => cheat.config.esp.status == 'full' ? false : (cheat.config.esp.nametags || inview),
				skins: ent => cheat.config.game.skins && typeof ent == 'object' && ent != null && ent.stats ? cheat.skins : ent.skins,
				input: input.push.bind(input),
				timer: (object, property, timer) => Object.defineProperty(object, property, {
					get: _ => cheat.config.game.inactivity ? 0 : timer,
					set: value => cheat.config.game.inactivity ? Infinity : timer,
				}),
			},
			WebSocket: Socket,
			WP_fetchMMToken: token,
		};
		
		await api.load;
		
		new Function(...Object.keys(args), krunker)(...Object.values(args));
	});
});