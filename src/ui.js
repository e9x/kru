'use strict';

exports.reload = () => this.control_updates.forEach(val => val());

exports.css = require('./ui.css');

exports.init = class {
	char_ins(str = ''){
		return str;
	}
	css_class(classn){
		return classn;
	}
	add_ele(node_name, parent, attributes){
		if(node_name == 'div')node_name = this.div;
		
		return Object.assign(parent.appendChild(document.createElement(node_name)), attributes);
	}
	process_controls(control, tab, tab_button, tab_ele){
		if(control.type == 'nested_menu'){
			control.tab_ele = this.add_ele('div', this.sections, { className: this.css_class('section'), style: 'display: none' });
			
			this.tabs.push(control.tab_ele);
			
			control.val.forEach(controle => this.process_controls(controle, tab, tab_button, control.tab_ele));
			
			if(control.load)control.load(control.tab_ele);
		}
		
		var content = this.add_ele('div', tab_ele, {
				className: this.css_class('control'),
			}),
			content_name = document.createElement(this.div), // append after stuff
			label_appended = false;
		
		control.interact = () => {
			switch(control.type){
				case'bool':
					this.set_walk(control, !this.get_walk(control));
					break
				case'bool_rot':
					control.aval = control.aval + 1
					if(control.aval >= control.vals.length)control.aval = 0 // past length
					this.set_walk(control, control.vals[control.aval][0]);
					break
				case'function':
					this.get_walk(control)();
					break
				case'function_inline':
					control.value();
					break
				case'nested_menu':
					this.tabs.forEach(ele => ele.style.display = 'none');
					control.tab_ele.removeAttribute('style');
					break
				case'textbox':
					this.set_walk(control, control.input.value.substr(0, control.max_length));
					break
			}
			
			control.update();
			this.data.config.save()
		};
		
		control.update = () => {
			if(control.button)control.button.innerHTML = this.char_ins('[' + (control.key == 'unset' ? '-' : control.key) + ']');
			
			switch(control.type){
				case'bool':
					control.button.className = this.css_class('toggle') + ' ' + this.css_class(!!this.get_walk(control));
					break;
				case'bool_rot':
					content_name.innerHTML = this.char_ins(control.name + ': ' + control.vals[control.aval][1]);
					break;
				case'text-small':
					content_name.style.border = 'none';
					content_name.style['font-size'] = '12px';
					content_name.style['padding-left'] = '8px';
					break;
				case'text-medium':
					content_name.style.border = 'none';
					content_name.style['font-size'] = '13px';
					content_name.style['padding-left'] = '8px';
					break;
				case'text-bold':
					content_name.style.border = 'none';
					content_name.style['font-weight'] = '600';
					content_name.style['padding-left'] = '8px';
					break;
				case'text-small-bold':
					content_name.style['font-size'] = '12px';
					content_name.style['font-weight'] = '600';
					content_name.style['padding-left'] = '8px';
					break;
				case'textbox':
					control.input.value = ('' + this.get_walk(control)).substr(0, control.max_length);
					break;
				case'slider':
					control.slider_bg.style.width = ((this.get_walk(control) / control.range[1]) * 100) + '%'
					control.slider.setAttribute('data-value', Number(this.get_walk(control).toString().substr(0, 10)));
					break;
			}
		};
		
		this.control_updates.push(control.update);
		
		if(control.key){
			control.button = this.add_ele('div', content, { className: this.css_class('toggle') });
			
			control.button.addEventListener('click', control.interact);
			
			control.button.innerHTML = this.char_ins(control.key == 'unset' ? '[-]' : '[' + control.key + ']');
		}
		
		switch(control.type){
			case'textbox':
				Object.assign(content.appendChild(content_name), {
					className: this.css_class('control-label'),
					innerHTML: this.char_ins(control.name),
				});
				
				content_name.style.padding = '0px 10px';
				content_name.style['border-left'] = 'none';
				content_name.style['border-right'] = '2px solid var(--secondary)';
				
				control.input = this.add_ele('input', content, { className: this.css_class('control-textbox'), placeholder: control.placeholder, spellcheck: false, value: this.get_walk(control) });
				
				label_appended = true;
				
				control.input.addEventListener('input', control.interact);
				
				break
			case'slider':
				var movement = { held: false, x: 0, y: 0 };
				
				var rtn = (number, unit) => (number / unit).toFixed() * unit,
					update_slider = event => {
						if(!movement.held)return;
						
						var slider_box = control.slider.getBoundingClientRect(),
							perc = ((event.pageX - slider_box.x) / slider_box.width) * 100,
							perc_rounded = rtn(perc, control.range[1] / 5).toFixed(2),
							value = ((control.range[1] / 100) * perc_rounded).toFixed(2);
						
						if(event.clientX <= slider_box.x)value = perc_rounded = 0;
						else if(event.clientX >= slider_box.x + slider_box.width)value = control.range[1], perc_rounded = 100;
						
						if(perc_rounded <= 100 && value >= control.range[0]){
							this.set_walk(control, +value);
							control.update();
							
							this.data.config.save();
						}
					};
				
				control.slider = this.add_ele('div', content, { className: this.css_class('control-slider') });
				control.slider_bg = this.add_ele('div', control.slider, { className: this.css_class('control-slider-bg'), style: 'width:' + (this.get_walk(control) / control.range[1] * 100 + '%') });
				
				control.slider.setAttribute('data-value', this.get_walk(control));
				
				control.slider.addEventListener('mousedown', event=>{
					movement = { held: true, x: event.layerX, y: event.layerY }
					update_slider(event);
				});
				
				window.addEventListener('mouseup', () => movement.held = false );
				
				window.addEventListener('mousemove', event => update_slider(event));
				
				break
			case'bool_rot':
				
				control.aval = control.vals.findIndex(([ val ]) => val == this.get_walk(control));
				if(control.aval == -1)control.aval = 0;
				
				break
		}
		
		if(!label_appended){
			content.appendChild(content_name);
			content_name.className = this.css_class('control-label');
			content_name.innerHTML = this.char_ins(control.name);
		}
		
		control.update(false);
		
		if(control.key && control.key != 'unset')this.keybinds.push({
			get code(){ return !isNaN(Number(control.key)) ? 'Digit' + control.key : /^F\d$/.test(control.key) ? control.key : 'Key' + control.key.toUpperCase() },
			get interact(){ return control.interact },
		});
	}
	wait_for(check, interval){
		return new Promise((resolve, reject) => interval = setInterval(() => {
			var checked = check();
			
			if(checked)clearInterval(interval); else return;
			
			resolve(checked);
			interval = null;
		}, 15));
	}
	walk(data){
		if(typeof data == 'string')data = data.split('.');
		
		var state = this.data.config.state(),
			last_state,
			last_key;
		
		data.forEach(key => state = (last_state = state)[last_key = key]);
		
		return [ last_state, last_key ];
	}
	get_walk(control){
		var walked = this.walk(control.walk);
		
		return walked[0][walked[1]];
	}
	set_walk(control, value){
		var walked = this.walk(control.walk);
		
		return walked[0][walked[1]] = value;
	}
	constructor(data){
		this.data = data;
		this.pos = { x: 0, y: 0 };
		this.tabs = [];
		this.inputs = {};
		this.keybinds = [];
		this.control_updates = [];
		this.div = 'div';
		
		this.data.config.load().then(() => this.wait_for(() => document.head && document.documentElement)).then(() => {
			// write config.json at nwjs client startup
			this.data.config.save();
			
			// clear all inputs when window is not focused
			window.addEventListener('blur', () => this.inputs= []);
			
			window.addEventListener('keydown', event => {
				if(event.repeat || document.activeElement && document.activeElement.tagName == 'INPUT')return;
				
				this.inputs[event.code] = true;
				
				var keybind = this.keybinds.find(keybind => typeof keybind.code == 'string'
						? keybind.code == event.code || keybind.code.replace('Digit', 'Numpad') == event.code
						: keybind.code.some(keycode => keycode == event.code || keycode.replace('Digit', 'Numpad') == event.code));
				
				if(!keybind)return;
				
				keybind.interact();
			});
			
			window.addEventListener('keyup', event => this.inputs[event.code] = false);
			
			this.keybinds.push({
				code: this.data.toggle,
				interact: () => {
					event.preventDefault();
					this.panel.classList.toggle('close');
				},
			});
			
			document.addEventListener('mouseup', () => this.bar_pressed = false);
			
			document.addEventListener('mousemove', event => {
				if(this.prev_pos && this.bar_pressed){
					this.pos.x += event.pageX - this.prev_pos.x;
					this.pos.y += event.pageY - this.prev_pos.y;
					
					this.apply_bounds();
				}
				
				this.prev_pos = { x: event.pageX, y: event.pageY };
			});
			
			// load font
			new FontFace('Inconsolata', 'url("https://fonts.gstatic.com/s/inconsolata/v20/QldgNThLqRwH-OJ1UHjlKENVzkWGVkL3GZQmAwLYxYWI2qfdm7Lpp4U8WR32lw.woff2")', {
				family: 'Inconsolata',
				style: 'normal',
				weight: 400,
				stretch: '100%',
				unicodeRange: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
			}).load().then(font => document.fonts.add(font));
			
			this.add_ele('link', document.head, { rel: 'stylesheet', href: URL.createObjectURL(new Blob([ exports.css.replace(/\.((?:(?!\[|\d|:|,|\.)\S)+)/g, (m, cl) => '.' + this.css_class(cl)) ], { type: 'text/css' })) });
			
			this.panel = this.add_ele('div', document.documentElement, { className: this.css_class('ss-panel') });
			
			this.title = this.add_ele('div', this.panel, { innerHTML: this.char_ins(data.title), className: this.css_class('title') });
			
			this.add_ele('div', this.title, { className: this.css_class('version'), innerHTML: this.char_ins('v' + data.version) });
			
			this.title.addEventListener('mousedown', () => this.bar_pressed = true);
			
			this.sections = this.add_ele('div', this.panel, { className: this.css_class('sections') });
			this.sidebar_con = this.add_ele('div', this.sections, { className: this.css_class('sidebar' ) });
			
			data.values.forEach((tab, index) => {
				var tab_button = this.add_ele('div', this.sidebar_con, {
						className: this.css_class('section'),
					}),
					tab_ele = this.add_ele('div', this.sections, {
						className: this.css_class('section'),
						style: index > 0 ? 'display:none' : '',
					});
				
				this.tabs.push(tab_ele);
				
				tab_button.addEventListener('click', () => (this.tabs.forEach(ele => ele.style.display = 'none'), tab_ele.removeAttribute('style')));
				
				tab_button.innerHTML = this.char_ins(tab.name);
				
				if(tab.load)tab.load(tab_ele);
				
				tab.contents.forEach(control => { try{ this.process_controls(control, tab, tab_button, tab_ele) }catch(err){ console.error('Encountered error at %c' + control.name + ' (' + control.val + ')', 'color: #FFF', err) }});
			});
			
			// add footer last
			if(this.data.footer)this.add_ele('div', this.panel, { className: this.css_class('footer'), innerHTML: this.char_ins(this.data.footer) });
			
			setTimeout(() => (this.pos = { x: 20, y: (window.innerHeight / 2) - (this.panel.getBoundingClientRect().height / 2) }, this.apply_bounds()));
		});
	}
	apply_bounds(){
		var size = this.panel.getBoundingClientRect();
		
		this.panel.style.left = Math.min(Math.max(this.pos.x, 0), window.innerWidth - size.width) + 'px';
		this.panel.style.top = Math.min(Math.max(this.pos.y, 0), window.innerHeight - size.height) + 'px';
	}
};