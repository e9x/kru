'use strict';

var manifest = require('../manifest.json');

exports.rnds = new Proxy({}, {
	get(target, prop){
		if(!target[prop])target[prop] = [...Array(16)].map(() => Math.random().toString(36)[2]).join('').replace(/(\d|\s)/, 'V').toLowerCase().substr(0, 6);
		
		return target[prop];
	}
});

exports.wrap = str => JSON.stringify([ str ]).slice(1, -1);

exports.clone_obj = obj => JSON.parse(JSON.stringify(obj));

exports.reload = () => this.control_updates.forEach(val => val());

exports.css = `
.ss-panel {
	--primary: #eee;
	--secondary: #445;
	--background: #112;
	--background-split: 17, 17, 34;
	--true: #2A0;
	--false: #A00;
	--control-height: 36px;
	--blue: #29F;
	border: 2px solid var(--primary);
	z-index: 9000000;
	position: absolute;
	display: flex;
	width: 375px;
	background: rgba(var(--background-split), 0.8);
	flex-direction: column;
	user-select: none;
	opacity: 0.8;
}

.ss-panel * {
	color: var(--primary);
	font: 13px Inconsolata, monospace;
	outline: none;
}

.ss-panel.close {
	display: none;
}

.ss-panel:hover {
	opacity: 1;
}

.ss-panel > .title, .ss-panel > .footer {
	text-align: center;
	padding: 8px 0px;
	z-index: 5;
	position: relative;
	display: flex;
	justify-content: center;
}

.ss-panel > .title > .version {
	position: absolute;
	right: 10px;
	margin: auto;
	text-align: center;
}

.ss-panel > .sections {
	display: flex;
	border-top: 2px solid var(--primary);
	min-height: 226px;
	border-bottom: 2px solid var(--secondary);
}

.ss-panel > .sections > .sidebar {
	width: 30%;
	height: auto;
	display: block;
	flex: none;
	border-right: 2px solid var(--secondary);
}

.ss-panel > .sections > .sidebar > .section {
	height: var(--control-height);
	line-height: var(--control-height);
	text-align: center;
	border-bottom: 2px solid var(--secondary);
}

.ss-panel > .sections > .sidebar > .section:hover {
	background: #666;
}

.ss-panel > .sections > .sidebar > .section:last-of-type {
	border-bottom: none;
}

.ss-panel > .sections > .section {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
}

.ss-panel > .sections > .section > .control {
	min-height: var(--control-height);
	border-bottom: 2px solid var(--secondary);
	display: flex;
	flex-direction: row;
}

.ss-panel > .sections > .section > .control:last-of-type {
	border-bottom: none;
}

.ss-panel > .sections > .section > .control > .toggle {
	width: var(--control-height);
	text-align: center;
	line-height: var(--control-height) !important;
}

.ss-panel > .sections > .section > .control > .toggle:hover {
	background: #333;
	filter: brightness(125%);
}

.ss-panel > .sections > .section > .control > .toggle.true {
	background: var(--true);
}

.ss-panel > .sections > .section > .control > .toggle.false {
	background: var(--false);
}

.control-textbox {
	height: 28px;
	display: block;
	font: 14px Inconsolata, monospace;
	padding: 0px .75rem 0px 0px;
	text-align: right;
	border: 1px solid #2B4194;
	margin: auto 3px;
	color: black;
}

.control-textbox:focus {
	box-shadow: 0px 0px 0px 3px #037;
}

.control-label {
	flex: 1 1 0;
	padding-left: 15px;
	line-height: var(--control-height) !important;
	border-left: 2px solid var(--secondary);
}

.control-slider {
	flex: 1 1 0;
	height: 28px;
	cursor: w-resize;
	background: #333;
	margin: auto 3px;
}

.control-slider:hover {
	background: #333
}

.control-slider-bg {
	background: #2ad;
	height: 100%
}

.control-slider:hover .control-slider-bg {
	background: #4ad
}

.control-slider::after {
	position: relative;
	height: 100%;
	text-align: center;
	display: block;
	line-height: 28px !important;
	top: -28px;
	content: attr(data-value)
}
`;

exports.init = class {
	char_ins(str = ''){
		/*if(!this.css_rng)*/return str;
		
		var output = '';
		
		(str + '').split(' ').forEach((word, word_index) => (word.split('').forEach((chr, chr_index) => output += (!chr_index || chr_index == word.length) ? '<s class="' + exports.rnds.chr + '">&#' + chr.charCodeAt() + '</s>' : '<s class="' + exports.rnds.chr + '">&#8203;<s class="' + exports.rnds.chr1 + '"></s>&#' + chr.charCodeAt() + '</s>'), output += word_index != (str + '').split(' ').length - 1 ? ' ' : ''));
		
		return output
	}
	css_class(classn){
		return /* this.css_rng ? classn.toString().split(' ').map(cl => exports.rnds['.' + cl]) : */ classn;
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
					control.set(!control.get())
					break
				case'bool_rot':
					control.aval = control.aval + 1
					if(control.aval >= control.vals.length)control.aval = 0 // past length
					control.set(control.vals[control.aval].val);
					break
				case'function':
					control.get()();
					break
				case'function_inline':
					control.val();
					break
				case'nested_menu':
					this.tabs.forEach(ele => ele.style.display = 'none');
					control.tab_ele.removeAttribute('style');
					break
				case'textbox':
					control.set(control.input.value.substr(0, control.max_length));
					break
			}
			
			control.update();
			this.data.config.save()
		};
		
		control.update = () => {
			if(control.button)control.button.innerHTML = this.char_ins('[' + (control.key == 'unset' ? '-' : control.key) + ']');
			
			switch(control.type){
				case'bool':
					control.button.className = this.css_class('toggle') + ' ' + this.css_class(!!control.get());
					break;
				case'bool_rot':
					content_name.innerHTML = this.char_ins(control.name + ': ' + control.vals[control.aval].display);
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
					control.input.value = ('' + control.get()).substr(0, control.max_length);
					break;
				case'slider':
					control.slider_bg.style.width = ((control.get() / control.range[1]) * 100) + '%'
					control.slider.setAttribute('data-value', Number(control.get().toString().substr(0, 10)));
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
				
				control.input = this.add_ele('input', content, { className: this.css_class('control-textbox'), placeholder: control.placeholder, spellcheck: false, value: control.get() });
				
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
							control.set(Number(value));
							control.update();
							
							this.data.config.save();
						}
					};
				
				control.slider = this.add_ele('div', content, { className: this.css_class('control-slider') });
				control.slider_bg = this.add_ele('div', control.slider, { className: this.css_class('control-slider-bg'), style: 'width:' + (control.get() / control.range[1] * 100 + '%') });
				
				control.slider.setAttribute('data-value', control.get());
				
				control.slider.addEventListener('mousedown', event=>{
					movement = { held: true, x: event.layerX, y: event.layerY }
					update_slider(event);
				});
				
				window.addEventListener('mouseup', () => movement.held = false );
				
				window.addEventListener('mousemove', event => update_slider(event));
				
				break
			case'bool_rot':
				
				control.vals.forEach((entry, index) =>{ if(entry.val == control.get())control.aval = index })
				if(!control.aval)control.aval = 0
				
				break
		}
		
		if(!label_appended){
			content.appendChild(content_name);
			content_name.className = this.css_class('control-label');
			content_name.innerHTML = this.char_ins(control.name);
		}
		
		control.update(false);
		
		if(control.key && control.key != 'unset')this.keybinds.push({
			get code(){ return !isNaN(Number(control.key)) ? 'Digit' + control.key : 'Key' + control.key.toUpperCase() },
			get interact(){ return control.interact; },
		});
	}
	wait_for(check, timeout = 5000){
		return new Promise((resolve, reject) => {
			var interval = setInterval(() => {
				var checked = check();
				
				if(checked)clearInterval(interval); else return;
				
				resolve(checked);
				interval = null;
			}, 15);
			
			setTimeout(() => {
				if(interval)return clearInterval(interval), reject('timeout');
			}, timeout);
		});
	}
	constructor(data){
		/*this.css_rng = true;*/
		this.div = /*this.css_rng ? exports.rnds.div + '-' + exports.rnds.div1 :*/ 'div';
		
		this.data = data;
		this.pos = { x: 0, y: 0 };
		this.tabs = [];
		this.inputs = {};
		this.keybinds = [];
		this.control_updates = [];
		
		this.data.config.load().then(() => {
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
			
			this.add_ele('link', document.head, { rel: 'stylesheet', href: URL.createObjectURL(new Blob([ `.${exports.rnds.chr}{white-space:nowrap;text-decoration: none}.${exports.rnds.chr1}{display:none;font-size:0px}${this.div}{display:block}` + exports.css.replace(/\.((?:(?!\[|\d|:|,|\.)\S)+)/g, (m, cl) => '.' + this.css_class(cl)) ], { type: 'text/css' })) });
			
			/*if(this.css_rng)customElements.define(this.div, class extends HTMLDivElement {}, { extends: 'div' });*/
			
			this.panel = this.add_ele('div', document.documentElement, { className: this.css_class('ss-panel') });
			
			this.title = this.add_ele('div', this.panel, { innerHTML: this.char_ins(data.title), className: this.css_class('title') });
			
			this.add_ele('div', this.title, { className: this.css_class('version'), innerHTML: this.char_ins('v' + manifest.version) });
			
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