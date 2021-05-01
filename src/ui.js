'use strict';
var constants = require('./consts.js');

class Control {
	constructor(data, section, ui){
		this.data = data;
		this.name = this.data.name;
		this.key = this.data.key;
		this.ui = ui;
		this.container = constants.add_ele('div', section, { className: 'control' });
		this.button = constants.add_ele('div', this.container, { className: 'toggle' });
		this.label = constants.add_ele('div', this.container, { className: 'label' });
		this.button.addEventListener('click', () => (this.interact(), this.update()));
		
		if(this.key)this.ui.keybinds.push({
			code: this.key,
			interact: () => {
				if(this.ui.panel.classList.contains('close'))return;
				
				this.interact();
				this.update();
			},
		});
	}
	walk(){
		var state = this.ui.data.config.state(),
			last_state,
			last_key;
		
		this.data.walk.split('.').forEach(key => state = (last_state = state)[last_key = key]);
		
		return [ last_state, last_key ];
	}
	get value(){
		if(this.data.hasOwnProperty('value'))return this.data.value;
		
		var walked = this.walk();
		
		return walked[0][walked[1]];
	}
	set value(value){
		var walked = this.walk();
		
		walked[0][walked[1]] = value;
		
		this.ui.data.config.save();
		
		return value;
	}
	interact(){
		console.warn('No defined interaction for', this);
	}
	update(){
		this.button.textContent = '[' + (this.data.key || '-').slice(-1) + ']';
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
		this.value_index = this.data.vals.findIndex(([ val ]) => val == this.value);
	}
	interact(){
		this.value = this.data.vals[this.value_index = (this.value_index + 1) % this.data.vals.length][0];
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
				
				var unit = this.data.range[2] ? this.data.range[2] : this.data.range[1] / 5,
					slider_box = this.slider.getBoundingClientRect(),
					perc = ((event.pageX - slider_box.x) / slider_box.width) * 100,
					perc_rounded = rtn(perc, unit).toFixed(2),
					value = +((this.data.range[1] / 100) * perc_rounded).toFixed(2);
				
				if(event.clientX <= slider_box.x)value = perc_rounded = 0;
				else if(event.clientX >= slider_box.x + slider_box.width)value = this.data.range[1], perc_rounded = 100;
				
				if(perc_rounded <= 100 && value >= this.data.range[0]){
					this.value = value;
					this.update();
				}
			};
		
		this.slider = constants.add_ele('div', this.container, { className: 'ss-slider' });
		this.background = constants.add_ele('div', this.slider, { className: 'background', style: 'width:' + (this.value / this.data.range[1] * 100 + '%') });
		this.slider.dataset.value = this.value;
		
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

exports.init = class {
	process_controls(data, tab, section){
		var construct;
		
		switch(data.type){
			case'rotate': construct = RotateControl; break;
			case'boolean': construct = BooleanControl; break;
			case'function': construct = FunctionControl; break;
			case'textbox': construct = TextBoxControl; break;
			case'slider': construct = SliderControl; break;
			default: throw new TypeError('Unknown type: ' + data.type); break;
		}
		
		var control = new construct(data, section, this);
		
		control.update();
	}
	window_listen(event, callback, options){
		this.frame.contentWindow.addEventListener(event, callback, options);
		window.addEventListener(event, callback, options);
	}
	constructor(data){
		this.data = data;
		this.pos = { x: 0, y: 0 };
		this.inputs = {};
		this.keybinds = [];
		this.frame = constants.add_ele('iframe', document.documentElement, { style: 'z-index:9000000;border:none;position:absolute;background:#0000;width:376px;height:334px' });
		constants.add_ele('style', this.frame.contentWindow.document.documentElement, { textContent: require('./ui.css')  });
		
		// clear all inputs when window is not focused
		window.addEventListener('blur', () => this.inputs = {});
		
		this.window_listen('keydown', event => {
			if(event.repeat || document.activeElement && document.activeElement.tagName == 'INPUT')return;
			
			this.inputs[event.code] = true;
			
			this.keybinds.find(keybind => [].concat(keybind.code).some(keycode => [ keycode, keycode.replace('Digit', 'Numpad') ].includes(event.code)) && event.preventDefault() + keybind.interact());
		});
		
		this.window_listen('keyup', event => this.inputs[event.code] = false);
		
		this.keybinds.push({
			code: this.data.toggle,
			interact: () => {
				this.panel.classList.toggle('close');
			},
		});
		
		this.window_listen('mouseup', () => this.bar_pressed = false);
		
		window.addEventListener('mousemove', event => this.proc_move({ x: event.pageX, y: event.pageY }));
		
		this.frame.contentWindow.addEventListener('mousemove', event => this.proc_move({ x: event.pageX + this.frame.offsetLeft, y: event.pageY + this.frame.offsetTop }));
		
		this.panel = constants.add_ele('div', this.frame.contentWindow.document.documentElement, { className: 'ss-panel' + (constants.mobile ? ' mobile' : '') });
		
		this.title = constants.add_ele('div', this.panel, { innerHTML: data.title, className: 'title' });
		
		constants.add_ele('div', this.title, { className: 'version', innerHTML: 'v' + data.version });
		
		this.title.addEventListener('mousedown', () => this.bar_pressed = true);
		
		this.sections = constants.add_ele('div', this.panel, { className: 'sections' });
		this.sidebar_con = constants.add_ele('div', this.sections, { className: 'sidebar' });
		
		this.data.config.load(() => {
			this.tabs = data.values.map((tab, index) => {
				var section = constants.add_ele('div', this.sections, {
					className: 'section',
					style: index > 0 ? 'display:none' : '',
				});
				
				constants.add_ele('div', this.sidebar_con, { className: 'section', textContent: tab.name }).addEventListener('click', () => (this.tabs.forEach(ele => ele.style.display = 'none'), section.removeAttribute('style')));
				
				tab.contents.forEach(data => this.process_controls(data, tab, section));
				
				return section;
			});
			
			// add footer last
			if(this.data.footer)constants.add_ele('div', this.panel, { className: 'footer', innerHTML: this.data.footer });
		});
		
		setTimeout(() => (this.pos = { x: 20, y: (window.innerHeight / 2) - (this.panel.getBoundingClientRect().height / 2) }, this.apply_bounds()));
	}
	apply_bounds(){
		var size = this.panel.getBoundingClientRect();
		
		this.frame.style.left = Math.min(Math.max(this.pos.x, 0), window.innerWidth - size.width) + 'px';
		this.frame.style.top = Math.min(Math.max(this.pos.y, 0), window.innerHeight - size.height) + 'px';
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