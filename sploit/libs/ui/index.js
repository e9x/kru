'use strict';
var doc_input_active = doc => doc.activeElement && ['TEXTAREA', 'INPUT'].includes(doc.activeElement.tagName),
	{ global_listen, keybinds, panels, utils, frame } = require('./consts.js'),
	update_pe = event => {
		for(var ind in panels){
			if(!panels[ind].visible)continue;
			
			var rect = panels[ind].node.getBoundingClientRect(),
				hover = event.clientX >= rect.x && event.clientY >= rect.y && (event.clientX - rect.x) <= rect.width && (event.clientY - rect.y) <= rect.height;
			
			if(hover)return frame.style['pointer-events'] = 'all';
		}
		
		frame.style['pointer-events'] = 'none';
	},
	resize_canvas = () => {
		exports.canvas.width = frame.contentWindow.innerWidth;
		exports.canvas.height = frame.contentWindow.innerHeight;
	};

exports.ready = new Promise(resolve => frame.addEventListener('load', () => resolve()));

exports.ready.then(() => {
	exports.canvas = utils.add_ele('canvas', frame.contentWindow.document.documentElement);
	
	exports.ctx = exports.canvas.getContext('2d', { alpha: true });
	
	resize_canvas();

	frame.contentWindow.document.head.remove();
	frame.contentWindow.document.body.remove();

	global_listen('mousemove', update_pe);
	global_listen('mousedown', update_pe);
	global_listen('mouseup', update_pe);
	
	global_listen('keydown', event => {
		if(event.repeat || doc_input_active(document) || doc_input_active(frame.contentWindow.document))return;
		
		// some(keycode => typeof keycode == 'string' && [ keycode, keycode.replace('Digit', 'Numpad') ]
		keybinds.forEach(keybind => keybind.code.includes(event.code) && event.preventDefault() + keybind.interact());
	});
	
	frame.contentWindow.addEventListener('contextmenu', event => !(event.target != null && event.target instanceof frame.contentWindow.HTMLTextAreaElement) && event.preventDefault());
	
	window.addEventListener('resize', resize_canvas);
	
	utils.add_ele('style', frame.contentWindow.document.documentElement, { textContent: [
		require('./ui.css'),
		require('codemirror/theme/solarized.css'),
		require('codemirror/lib/codemirror.css'),
	].join('\n') });

	require('codemirror/mode/css/css.js');
});

document.documentElement.appendChild(frame);

exports.alert = desc => {
	var panel = new Panel({}, 'prompt');
	
	panel.fix_center();
	
	utils.add_ele('div', panel.node, { innerHTML: desc, className: 'description' });
	
	var form = utils.add_ele('form', panel.node);
	
	utils.add_ele('button', form, { textContent: 'OK', className: 'submit single' });
	
	panel.focus();
	
	return new Promise(resolve => form.addEventListener('submit', event => (event.preventDefault(), panel.remove(), resolve()), { once: true }));
};

exports.prompt = desc => {
	var panel = new Panel({}, 'prompt');
	
	panel.fix_center();
	
	utils.add_ele('div', panel.node, { textContent: desc, className: 'description' });
	
	var form = utils.add_ele('form', panel.node),
		input = utils.add_ele('input', form, { className: 'input' });
	
	utils.add_ele('button', form, { textContent: 'OK', className: 'submit' });
	
	var cancel = utils.add_ele('button', form, { textContent: 'Cancel', className: 'cancel' });
	
	panel.focus();
	
	return new Promise((resolve, reject) => form.addEventListener('submit', event => {
		event.preventDefault();
		
		(event.submitter == cancel ? reject : resolve)(input.value);
		
		panel.remove();
	}));
};

exports.options = (title, options) => {
	var panel = new Panel({}, 'options'),
		title = utils.add_ele('div', panel.node, { textContent: title, className: 'title' });
	
	panel.fix_center();
	
	panel.focus();
	
	return new Promise(resolve => {
		options.forEach((option, index) => utils.add_ele('div', panel.node, { className: 'control', textContent: option[0] }).addEventListener('click', () => (panel.hide(), resolve(option[1]))));
	});
};

exports.frame = frame;
exports.keybinds = keybinds;
exports.panels = panels;
exports.Loading = require('./loading');
exports.Config = require('./config/');
exports.Editor = require('./editor/');