'use strict';

var clone_obj = obj => JSON.parse(JSON.stringify(obj)),
	assign_deep = (target, ...objects) => {
		for(var ind in objects)for(var key in objects[ind]){
			if(typeof objects[ind][key] == 'object' && objects[ind][key] != null && key in target)assign_deep(target[key], objects[ind][key]);
			else if(typeof target == 'object' && target != null)Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(objects[ind], key))
		}
		
		return target;
	},
	{ api, utils, cheat, store, discord, github } = require('./consts.js'),
	spackage = require('../package.json');

exports.base_config = {
	ui_page: 0,
	binds: {
		reverse_cam: 'KeyF',
		toggle: 'KeyC',
		aim: 'Digit3',
		bhop: 'Digit4',
		esp: 'Digit5',
		tracers: 'Digit6',
		nametags: 'Digit7',
		overlay: 'Digit8',
	},
	aim: {
		status: 'off',
		offset: 'random',
		target_sorting: 'dist2d',
		smooth: 15,
		hitchance: 100,
		// percentage of screen
		fov_box: false,
		fov: 60,
	},
	esp: {
		status: 'off',
		walls: 100,
		labels: false,
		tracers: false,
	},
	game: {
		css: [],
		bhop: 'off',
		wireframe: false,
		auto_respawn: false,
		adblock: true,
		custom_loading: true,
		inactivity: true,
	},
};

exports.ui = {
	version: spackage.version,
	title: 'Sploit',
	store: store,
	config: {
		save: () => store.set('config', JSON.stringify(cheat.config)),
		load: () => store.get('config').then(config => {
			var parsed = {};
			try{ parsed = JSON.parse(config || '{}') }catch(err){ console.error(err, config) }
			
			return assign_deep(cheat.config, clone_obj(exports.base_config), parsed);
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
			name: 'Custom loading screen',
			type: 'boolean',
			walk: 'game.custom_loading',
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
		},{
			name: 'Remove inactivity',
			type: 'boolean',
			walk: 'game.inactivity',
		}],
	},{
		name: 'Aim',
		type: 'section',
		value: [{
			name: 'Smoothness',
			type: 'slider',
			walk: 'aim.smooth',
			unit: 'U',
			range: [ 0, 50, 2 ],
			labels: { 0: 'Off' },
		},{
			name: 'Target FOV',
			type: 'slider',
			walk: 'aim.fov',
			range: [ 10, 110, 10 ],
			labels: { 110: 'Ignore FOV' },
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
				[ 'torso', 'Torso' ],
				[ 'legs', 'Legs' ],
				[ 'random', 'Random' ],
			],
		},{
			name: 'Draw FOV box',
			type: 'boolean',
			walk: 'aim.fov_box',
		},{
			name: 'Auto reload',
			type: 'boolean',
			walk: 'aim.auto_reload',
		},{
			name: 'Wallbangs',
			type: 'boolean',
			walk: 'aim.wallbangs',
		}],
	},{
		name: 'Esp',
		type: 'section',
		value: [{
			name: 'Wall opacity',
			type: 'slider',
			walk: 'esp.walls',
			range: [ 0, 100, 5 ],
		},{
			name: 'Labels',
			type: 'boolean',
			walk: 'esp.labels',
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
		},
		{
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
			value: () => window.open(github, '_blank'),
		},{
			name: 'Save Krunker script',
			type: 'function',
			value(){
				var link = utils.add_ele('a', document.documentElement, { href: api.api_url(1, 'source' , { download: true }) });
				
				link.click();
				
				link.remove();
			},
		},{
			name: 'Reset Settings',
			type: 'function',
			async value(){
				for(var ind in cheat.css_editor.tabs.length)await cheat.css_editor.tabs[ind].remove();
				
				// reset everything but sliders
				await store.set('config', JSON.stringify(assign_deep(cheat.config, clone_obj(exports.base_config)), (prop, value) => typeof value == 'number' ? void'' : value));
				cheat.ui.update();
			},
			bind: 'binds.reset',
		}],
	},{
		name: 'Discord',
		type: 'function',
		value: () => window.open(discord, '_blank'),
	}],
};