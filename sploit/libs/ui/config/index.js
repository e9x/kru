'use strict';

var { keybinds, global_listen, utils } = require('../consts'),
	PanelDraggable = require('../paneldraggable'),
	Control = require('./control');

class TextElement {
	constructor(data, section, ui){
		this.data = data;
		this.ui = ui;
		this.container = utils.add_ele('div', section.node, { className: 'control' });
		this.node = utils.add_ele('div', this.container, { className: 'text' });
	}
	update(){
		this.node.textContent = this.data.name;
		
		this.node.innerHTML = this.node.innerHTML
		.replace(/\[([^\[]+)\]\(([^\)]+)\)/g, (match, text, link) => `<a href=${JSON.stringify(link)}>${text}</a>`)
		.replace(/(\*\*|__)(.*?)\1/g, (match, part, text) => `<strong>${text}</strong>`)
		.replace(/(\*|_)(.*?)\1/g, (match, part, text) => `<em>${text}</em>`)
		.replace(/\~\~(.*?)\~\~/g, (match, part, text) => `<del>${text}</del>`)
		;
	}
}

class BooleanControl extends Control {
	interact(){
		this.value = !this.value;
	}
	update(){
		super.update();
		this.button.className = 'toggle ' + !!this.value;
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

class LinkControl extends Control }
	interact(){
		window.open(this.value, '_blank');
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
		
		this.input = utils.add_ele('input', this.container, { className: 'keybind', placeholder: 'Press a key' });
		
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
		this.input.value = this.value ? utils.string_key(this.value) : 'Unset';
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
		
		this.slider = utils.add_ele('div', this.container, { className: 'slider' });
		this.background = utils.add_ele('div', this.slider, { className: 'background' });
		
		this.slider.addEventListener('mousedown', event=>{
			movement = { held: true, x: event.layerX, y: event.layerY }
			update_slider(event);
		});
		
		global_listen('mouseup', () => movement.held = false );
		
		global_listen('mousemove', event => update_slider(event));
	}
	update(){
		super.update();
		this.button.style.display = 'none';
		this.background.style.width = ((this.value / this.data.range[1]) * 100) + '%';
		this.slider.dataset.value = this.data.labels && this.data.labels[this.value] || this.value + (this.data.unit == null ? '%' : this.data.unit);
		this.label.textContent = this.name + ':';
	}
};

class Config extends PanelDraggable {
	constructor(data){
		super(data, 'config');
		
		this.config = this.data.config;
		
		this.title = this.listen_dragging(utils.add_ele('div', this.node, { textContent: data.title, className: 'title' }));
		
		utils.add_ele('div', this.title, { className: 'version', textContent: 'v' + data.version });
		
		this.sections_con = utils.add_ele('div', this.node, { className: 'sections' });
		this.sidebar_con = utils.add_ele('div', this.sections_con, { className: 'sidebar' });
		
		keybinds.push(this.toggle_bind = {
			code: [ 'F1' ],
			interact: () => {
				this.config.save();
				
				if(this.visible)this.hide();
				else this.show();
			},
		});
		
		this.sections = data.value.map((data, index) => {
			var section = {
				data: data,
				node: utils.add_ele('section', this.sections_con),
				show: () => {
					section.node.classList.remove('hidden');
					this.config.value.ui_page = index;
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
					case'link':  construct = LinkControl; break;
					case'textbox': construct = TextBoxControl; break;
					case'slider': construct = SliderControl; break;
					case'text': construct = TextElement; break;
					default: throw new TypeError('Unknown type: ' + data.type); break;
				}

				return new construct(data, section, this);
			});
			
			utils.add_ele('div', this.sidebar_con, { className: 'open-section', textContent: section.data.name }).addEventListener('click', () => {
				if(section.data.type == 'function')section.data.value();
				else this.sections.forEach(section => section.hide()), section.show();
			});
			
			return section;
		});
		
		setTimeout(() => {
			this.pos = { x: 1, y: this.center_side('height') };
			this.apply_bounds();
			this.load_ui_data();
		});
		
		this.footer = utils.add_ele('footer', this.node);
	}
	async update(load){
		if(load)await this.config.load();
		
		this.apply_bounds();
		
		this.sections.forEach(section => section.hide());
		this.sections[this.config.value.ui_page].show();
		
		this.toggle_bind.code = [ 'F1', this.config.value.binds.toggle ];
		
		this.footer.textContent = `Press ${this.toggle_bind.code.map(utils.string_key).map(x => '[' + x + ']').join(' or ')} to toggle`;
		
		this.sections.forEach(section => section.controls.forEach(control => control.update()));
	}
};

module.exports = Config;