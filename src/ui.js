'use strict';
var constants = require('./consts.js');

class Control {
	constructor(data, section, ui){
		var self = this;
		
		this.data = data;
		this.name = this.data.name;
		this.ui = ui;
		this.container = constants.add_ele('div', section.node, { className: 'control' });
		this.button = constants.add_ele('div', this.container, { className: 'toggle' });
		this.label = constants.add_ele('div', this.container, { className: 'label' });
		this.button.addEventListener('click', () => (this.interact(), this.update()));
		
		this.ui.keybinds.push({
			get code(){ return [ self.key ] },
			interact(){
				if(self.ui.frame.style.display == 'none')return;
				
				self.interact();
				self.update();
			},
		});
	}
	get key(){
		if(!this.data.key)return null;
		
		var walked = this.walk(this.data.key);
		return walked[0][walked[1]];
	}
	walk(data){
		var state = this.ui.config.value,
			last_state,
			last_key;
		
		data.split('.').forEach(key => state = (last_state = state)[last_key = key]);
		
		return [ last_state, last_key ];
	}
	get value(){
		if(this.data.hasOwnProperty('value'))return this.data.value;
		
		var walked = this.walk(this.data.walk);
		
		return walked[0][walked[1]];
	}
	set value(value){
		var walked = this.walk(this.data.walk);
		
		walked[0][walked[1]] = value;
		
		this.ui.config.save();
		
		return value;
	}
	interact(){
		console.warn('No defined interaction for', this);
	}
	update(){
		this.button.textContent = '[' + (this.key ? constants.string_key(this.key) : '-') + ']';
		this.label.textContent = this.name;
	}
}

class BooleanControl extends Control {
	interact(){
		this.value = !this.value;
	}
	update(){
		super.update();
		this.button.className = 'toggle  ' + !!this.value;
	}
}

class RotateControl extends Control {
	constructor(...args){
		super(...args);
	}
	get value_index(){
		return this.data.vals.findIndex(([ data ]) => data == this.value);
	}
	set value_index(value){
		this.value = this.data.vals[value][0];
	}
	interact(){
		this.value_index = (this.value_index + 1) % this.data.vals.length
	}
	update(){
		super.update();
		if(!this.data.vals[this.value_index])this.value_index = 0;
		this.label.textContent = this.name + ': ' + this.data.vals[this.value_index][1];
	}
}

class FunctionControl extends Control {
	interact(){
		this.value();
	}
}

class KeybindControl extends Control {
	constructor(...args){
		super(...args);
		
		this.input = constants.add_ele('input', this.container, { className: 'keybind', placeholder: 'Press a key' });
		
		this.input.addEventListener('focus', () => {
			this.input.value = '';
			
			
		});
		
		this.input.addEventListener('blur', () => {
			this.ui.update();
			this.update();
		});
		
		this.input.addEventListener('keydown', event => {
			event.preventDefault();
			this.value = event.code == 'Escape' ? null : event.code;
			this.input.blur();
		});
	}
	update(){
		super.update();
		this.button.style.display = 'none';
		this.label.textContent = this.name + ':';
		this.input.value = this.value ? constants.string_key(this.value) : 'Unset';
	}
}

class TextBoxControl extends Control {
	update(){
		this.button.style.display = 'none';
		this.input.value = ('' + this.value).substr(0, this.data.max_length);
	}
}

class SliderControl extends Control {
	constructor(...args){
		super(...args);
		
		var movement = { held: false, x: 0, y: 0 },
			rtn = (number, unit) => (number / unit).toFixed() * unit,
			update_slider = event => {
				if(!movement.held)return;
				
				var slider_box = this.slider.getBoundingClientRect(),
					min_val = this.data.range[0],
					max_val = this.data.range[1],
					unit = this.data.range[2],
					perc = ((event.pageX - slider_box.x) / slider_box.width) * 100,
					value = Math.max((((max_val)*perc/100)).toFixed(2), min_val);
				
				if(unit)value = rtn(value, unit);
				
				if(event.clientX <= slider_box.x)value = perc = min_val;
				else if(event.clientX >= slider_box.x + slider_box.width)value = max_val, perc = 100;
				
				this.value = value;
				this.update();
			};
		
		this.slider = constants.add_ele('div', this.container, { className: 'slider' });
		this.background = constants.add_ele('div', this.slider, { className: 'background' });
		
		this.slider.addEventListener('mousedown', event=>{
			movement = { held: true, x: event.layerX, y: event.layerY }
			update_slider(event);
		});
		
		this.ui.window_listen('mouseup', () => movement.held = false );
		
		this.ui.window_listen('mousemove', event => update_slider(event));
	}
	update(){
		super.update();
		this.button.style.display = 'none';
		this.background.style.width = ((this.value / this.data.range[1]) * 100) + '%';
		this.slider.dataset.value = this.value;
		this.label.textContent = this.name + ':';
	}
}

module.exports = class {
	constructor(data){
		this.data = data;
		this.pos = { x: 0, y: 0 };
		this.inputs = {};
		this.keybinds = [];
		this.config = this.data.config;
		this.frame = constants.add_ele('iframe', document.documentElement, { style: 'z-index:9000000;border:none;position:absolute;background:#0000;display:none' });
		this.panel = constants.add_ele('main', this.frame.contentWindow.document.documentElement);
		
		constants.add_ele('style', this.panel, { textContent: require('./ui.css')  });
		
		// add custom font to main page
		this.frame.contentWindow.document.fonts.ready.then(() => this.frame.contentWindow.document.fonts.forEach(font => document.fonts.add(font)));
		
		// clear all inputs when window is not focused
		window.addEventListener('blur', () => this.inputs = {});
		
		this.window_listen('keydown', event => {
			if(event.repeat || document.activeElement && document.activeElement.tagName == 'INPUT')return;
			
			this.inputs[event.code] = true;
			
			// console.log(this.keybinds);
			// some(keycode => typeof keycode == 'string' && [ keycode, keycode.replace('Digit', 'Numpad') ]
			this.keybinds.forEach(keybind => keybind.code.includes(event.code) && event.preventDefault() + keybind.interact());
		});
		
		this.window_listen('keyup', event => this.inputs[event.code] = false);
		
		this.window_listen('mouseup', () => {
			this.bar_pressed = false;
			this.pos = this.bounds();
		});
		
		window.addEventListener('mousemove', event => this.proc_move({ x: event.pageX, y: event.pageY }));
		
		this.frame.contentWindow.addEventListener('mousemove', event => this.proc_move({ x: event.pageX + this.frame.offsetLeft, y: event.pageY + this.frame.offsetTop }));
		
		this.title = constants.add_ele('div', this.panel, { innerHTML: data.title, className: 'title' });
		
		constants.add_ele('div', this.title, { className: 'version', innerHTML: 'v' + data.version });
		
		this.title.addEventListener('mousedown', () => this.bar_pressed = true);
		
		this.sections_con = constants.add_ele('div', this.panel, { className: 'sections' });
		this.sidebar_con = constants.add_ele('div', this.sections_con, { className: 'sidebar' });
		
		this.keybinds.push({
			code: [ 'F1' ],
			interact: () => {
				this.config.value.ui.visible ^= 1;
				this.config.save();
				this.update(false);
			},
		});
		
		this.sections = data.value.map((data, index) => {
			var section = {
				data: data,
				node: constants.add_ele('section', this.sections_con),
				show: () => {
					section.node.classList.remove('hidden');
					this.config.value.ui.page = index;
					this.config.save();
				},
				hide: () => {
					section.node.classList.add('hidden');
				},
				controls: [],
			};
			
			if(section.data.type != 'function')section.controls = section.data.value.map(data => {
				var construct;

				switch(data.type){
					case'keybind': construct = KeybindControl; break;
					case'rotate': construct = RotateControl; break;
					case'boolean': construct = BooleanControl; break;
					case'function': construct = FunctionControl; break;
					case'textbox': construct = TextBoxControl; break;
					case'slider': construct = SliderControl; break;
					default: throw new TypeError('Unknown type: ' + data.type); break;
				}

				return new construct(data, section, this);
			});
			
			constants.add_ele('div', this.sidebar_con, { className: 'open-section', textContent: section.data.name }).addEventListener('click', () => {
				if(section.data.type == 'function')section.data.value();
				else this.sections.forEach(section => section.hide()), section.show();
			});
			
			return section;
		});
		
		this.footer = constants.add_ele('footer', this.panel);
	}
	window_listen(event, callback, options){
		this.frame.contentWindow.addEventListener(event, callback, options);
		document.addEventListener(event, callback, options);
	}
	async update(load = true){
		if(load)await this.config.load();
		
		this.frame.style.display = this.config.value.ui.visible ? 'block' : 'none';
		
		this.pos = { x: 20, y: (window.innerHeight / 2) - (this.panel.getBoundingClientRect().height / 2) };
		
		this.apply_bounds();
		
		this.frame.style.width = this.frame.style.height = 'unset';
		
		this.frame.style.width = this.panel.scrollWidth + 30 + 'px';
		this.frame.style.height = this.panel.scrollHeight + 'px';
		
		this.sections.forEach(section => section.hide());
		this.sections[this.config.value.ui.page].show();
		
		this.keybinds[0].code = [ 'F1', this.config.value.binds.toggle ];
		
		this.footer.textContent = `Press ${this.keybinds[0].code.map(constants.string_key).map(x => '[' + x + ']').join(' or ')} to toggle`;
		
		this.sections.forEach(section => section.controls.forEach(control => control.update()));
	}
	bounds(){
		var size = this.panel.getBoundingClientRect();
		
		return { x: Math.min(Math.max(this.pos.x, 0), window.innerWidth - size.width), y: Math.min(Math.max(this.pos.y, 0), window.innerHeight - size.height) };
	}
	apply_bounds(){
		var bounds = this.bounds();
		
		this.frame.style.left = bounds.x + 'px';
		this.frame.style.top = bounds.y + 'px';
	}
	proc_move(pos){
		if(this.prev_pos && this.bar_pressed){
			this.pos.x += pos.x - this.prev_pos.x;
			this.pos.y += pos.y - this.prev_pos.y;
			
			this.apply_bounds();
		}
		
		this.prev_pos = pos;
	}
};

module.exports.panel = {
	options(data){
		var frame = constants.add_ele('iframe', document.documentElement, { style: 'margin:auto;top:0px;bottom:0px;left:0px;right:0px;z-index:9000000;border:none;position:absolute;background:#0000' }),
			panel = constants.add_ele('main', frame.contentDocument.documentElement, { className: 'options' }),
			title = constants.add_ele('div', panel, { innerHTML: data.title, className: 'title' });
		
		constants.add_ele('style', panel, { textContent: require('./ui.css')  });
		
		return new Promise(resolve => {
			data.options.forEach((option, index) => constants.add_ele('div', panel, { className: 'control option', textContent: option[0] }).addEventListener('click', () => (frame.remove(), resolve(option[1]))));
			frame.style.width = panel.scrollWidth + 'px';
			frame.style.height = panel.scrollHeight + 'px';
		});
	},
};