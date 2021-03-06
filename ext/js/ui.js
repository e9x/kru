'use strict';

var manifest = require('../manifest.json');

exports.rnds = new Proxy({}, {
	get(target, prop){
		if(!target[prop])target[prop] = [...Array(16)].map(() => Math.random().toString(36)[2]).join('').replace(/(\d|\s)/, 'V').toLowerCase().substr(0, 6);
		
		return target[prop];
	}
});

exports.chr_ins = str => {
	var output = '';
	
	(str + '').split(' ').forEach((word, word_index) => (word.split('').forEach((chr, chr_index) => output += (!chr_index || chr_index == word.length) ? '<s class="' + exports.rnds.chr + '">&#' + chr.charCodeAt() + '</s>' : '<s class="' + exports.rnds.chr + '">&#8203;<s class="' + exports.rnds.chr1 + '"></s>&#' + chr.charCodeAt() + '</s>'), output += word_index != (str + '').split(' ').length - 1 ? ' ' : ''));
	
	return output
};

exports.wrap = str => JSON.stringify([ str ]).slice(1, -1);

exports.clone_obj = obj => JSON.parse(JSON.stringify(obj));

exports.reload = () => this.control_updates.forEach(val => val());

exports.css = `
.con {
	border-radius: 2px;
	border: 2px solid #eee;
	z-index: 9000000;
	position: absolute;
	display: flex;
	width: 420px;
	height: 294px;
	background: #112B;
	flex-direction: column;
	transition: opacity .15s ease-in-out, color .15s ease-in-out, background-color .15s ease-in-out, border-color .15s ease-in-out, box-shadow .15s ease-in-out;
	user-select: none;
	opacity: 0.8;
}

.con[data-open~='1'] {
	display: none;
}

.con:hover {
	opacity: 1;
}

.con, .con * {
	color: #eee;
	font: 13px Inconsolata, monospace;
}

.cons {
	display: flex;
	flex: 1 1 0;
	border-top: 2px solid #eee;
}

.bar {
	height: 32px;
	min-height: 32px;
	line-height: 28px;
	text-align: center;
}

.bar-top {
	transition: opacity .15s ease-in-out, color .15s ease-in-out, background-color .15s ease-in-out, border-color .15s ease-in-out, box-shadow .15s ease-in-out;
	z-index: 20;
}

.bar-top:hover {
	box-shadow: 0px 0px 0px 2px #29F;
}

.bar-top:active {
	background: #224;
}

.sidebar-con {
	width: 30%;
	height: auto;
	display: block;
	flex: none;
	border-right: 2px solid #445;
	border-bottom: 2px solid #445
}

.tab-button {
	height: 36px;
	line-height: 36px;
	text-align: center;
	border-bottom: 2px solid #445;
	transition: color .15s ease-in-out,background-color .15s ease-in-out, border-color .15s ease-in-out,box-shadow .15s ease-in-out;
}

.tab-button:hover {
	background: #666;
}

.tab-button:active {
	background: #333;
	box-shadow: -3px -1px 0px 3px #CCC6;
}

.content-con {
	flex: 1 1 0;
	display: flex;
	flex-direction: column;
	height: 100%;
}

.content-con::-webkit-scrollbar {
	width: 10px;
}

.content-con::-webkit-scrollbar-thumb {
	background-color: #EEE;
}

.content {
	min-height: 36px;
	border-bottom: 2px solid #445;
	display: flex;
	flex-direction: row;
}

.control-button {
	width: 36px;
	text-align: center;
	line-height: 36px;
	transition: color .15s ease-in-out,background-color .15s ease-in-out, border-color .15s ease-in-out,box-shadow .15s ease-in-out;
}

.control-button:hover {
	background: #333;
	filter: brightness(125%);
}

.control-button:active {
	box-shadow: 0px 0px 0px 3px #CCC6;
}

.control-button.true {
	background: #2A0;
}

.control-button.true:active {
	box-shadow: 0px 0px 0px 3px #2A06;
}

.control-button.false {
	background: #A00;
}

.control-button.false:active {
	box-shadow: 0px 0px 0px 3px #A006;
}

.control-textbox {
	height: 28px;
	display: block;
	font: 14px Inconsolata, monospace;
	padding: 0px .75rem 0px 0px;
	text-align: right;
	transition: color .15s ease-in-out,background-color .15s ease-in-out, border-color .15s ease-in-out,box-shadow .15s ease-in-out;
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
	line-height: 36px;
	border-left: 2px solid #445;
}

.control-slider {
	-webkit-appearance: none;
	appearance: none;
	flex: 1 1 0;
	height: 28px;
	margin: 4px 0 4px 5px;
	cursor: w-resize;
	background: #333
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
	line-height: 28px;
	top: -28px;
	content: attr(data)
}

.tab-desc {
	text-align: center;
	font-size: 12px;
	width: 100%;
	line-height: 34px;
	height: 34px;
}

.ver {
	position: absolute;
	top: 0px;
	right: 0px;
	width: 60px;
	margin: auto;
	line-height: 34px;
	height: 34px;
	text-align: center;
}

* {
	outline: none;
}
`;

exports.init = class {
	css_class(c){
		return exports.rnds['.' + c];
	}
	add_ele(node_name, parent, attributes){
		if(node_name == 'div')node_name = this.div;
		
		return Object.assign(parent.appendChild(document.createElement(node_name)), attributes);
	}
	process_controls(control, tab, tab_button, tab_ele){
		if(control.type == 'nested_menu'){
			control.tab_ele = this.add_ele('div', this.cons, { className: this.css_class('content-con'), style: 'display: none' });
			
			this.tabs.push(control.tab_ele);
			
			control.val.forEach(controle => this.process_controls(controle, tab, tab_button, control.tab_ele));
			
			if(control.load)control.load(control.tab_ele);
		}
		
		var content = this.add_ele('div', tab_ele, {
				className: this.css_class('content'),
			}),
			content_name = document.createElement(this.div), // append after stuff
			label_appended = false;
		
		control.interact = data => {
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
			this.data.config.save();
		};
		
		control.update = () => {
			if(control.button)control.button.innerHTML = exports.chr_ins('[' + (control.key == 'unset' ? '-' : control.key) + ']');
			
			switch(control.type){
				case'bool':
					control.button.className = this.css_class('control-button') + ' ' + this.css_class(!!control.get());
					break;
				case'bool_rot':
					content_name.innerHTML = exports.chr_ins(control.name + ': ' + control.vals[control.aval].display);
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
					control.slider_bg.style.width = ((control.get() / control.max_val) * 100) + '%'
					control.slider.setAttribute('data', Number(control.get().toString().substr(0, 10)));
					break;
			}
			
			this.data.config.save();
		};
		
		this.control_updates.push(control.update);
		
		if(control.key){
			control.button = this.add_ele('div', content, {
				className: this.css_class('control-button'),
			});
			
			control.button.addEventListener('click', control.interact);
			
			control.button.innerHTML = exports.chr_ins(control.key == 'unset' ? '[-]' : '[' + control.key + ']');
		}
		
		
		switch(control.type){
			case'textbox':
				Object.assign(content.appendChild(content_name), {
					className: this.css_class('control-label'),
					innerHTML: exports.chr_ins(control.name),
				});
				
				content_name.style.padding = '0px 10px';
				content_name.style['border-left'] = 'none';
				content_name.style['border-right'] = '2px solid #445';
				
				control.input = this.add_ele('input', content, { className: this.css_class('control-textbox'), placeholder: control.placeholder, spellcheck: false, value: control.get() });
				
				// .style.display = 'none';
				label_appended = true;
				
				control.input.addEventListener('input', control.interact);
				
				break
			case'slider':
				var movement = { held: false, x: 0, y: 0 };
				
				var rtn = (number, unit) => (number / unit).toFixed() * unit,
					update_slider = event => {
						if(!movement.held)return;
						
						var slider_box = control.slider.getBoundingClientRect(),
							perc = (event.offsetX / control.slider.offsetWidth * 100).toFixed(2),
							perc_rounded = rtn(perc, control.unit / 10).toFixed(2),
							value = ((control.max_val / 100) * perc_rounded).toFixed(2);
						
						if(event.clientX <= slider_box.x){
							value = 0;
							perc_rounded = 0;
						}else if(event.clientX >= slider_box.x + slider_box.width){
							value = control.max_val;
							perc_rounded = 100;
						}
						
						if(perc_rounded <= 100 && value >= control.min_val){
							control.set(Number(value));
							control.update();
							
							this.data.config.save();
						}
					};
				
				control.slider = content.appendChild(document.createElement('div'));
				control.slider_bg = control.slider.appendChild(document.createElement('div'));
				control.slider.className = this.css_class('control-slider');
				control.slider_bg.className = this.css_class('control-slider-bg');
				
				control.slider_bg.style.width = control.get() / control.max_val * 100 + '%'
				control.slider.setAttribute('data', control.get());
				
				control.slider.addEventListener('mousedown', event=>{
					movement = { held: true, x: event.layerX, y: event.layerY }
					update_slider(event);
				});
				
				parent.addEventListener('mouseup', _=> movement.held = false );
				
				parent.addEventListener('mousemove', event=> update_slider(event));
				
				break
			case'bool_rot':
				
				control.vals.forEach((entry, index) =>{ if(entry.val == control.get())control.aval = index })
				if(!control.aval)control.aval = 0
				
				break
		}
		
		if(!label_appended){
			content.appendChild(content_name);
			content_name.className = this.css_class('control-label');
			content_name.innerHTML = exports.chr_ins(control.name);
		}
		
		control.update();
		
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
		this.div = exports.rnds.div + '-' + exports.rnds.div1;
		
		this.data = data;
		this.pos = { x: 0, y: 0 };
		this.tabs = [];
		this.inputs = {};
		this.keybinds = [];
		this.control_updates = [];
		
		this.data.config.load();
		
		// clear all inputs when window is not focused
		parent.addEventListener('blur', () => this.inputs= []);
		
		parent.addEventListener('keydown', event => {
			if(event.repeat || parent.document.activeElement && parent.document.activeElement.tagName == 'INPUT')return;
			
			this.inputs[event.code] = true;
			
			var keybind = this.keybinds.find(keybind => typeof keybind.code == 'string'
					? keybind.code == event.code || keybind.code.replace('Digit', 'Numpad') == event.code
					: keybind.code.some(keycode => keycode == event.code || keycode.replace('Digit', 'Numpad') == event.code));
			
			if(!keybind)return;
			
			keybind.interact(event);
		});
		
		parent.addEventListener('keyup', event => this.inputs[event.code] = false);
		
		this.keybinds.push({
			code: ['KeyC', 'F1'],
			interact: () => {
				event.preventDefault();
				this.container.dataset.open ^= 1;
			},
		});
		
		this.wait_for(() => parent.document.body).then(() => {
			parent.document.addEventListener('mouseup', () => this.bar_pressed = false);
			
			parent.document.addEventListener('mousemove', event => {
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
			}).load().then(font => parent.document.fonts.add(font));
			
			this.add_ele('link', parent.document.head, { rel: 'stylesheet', href: parent.URL.createObjectURL(new Blob([ `.${exports.rnds.chr}{white-space: nowrap;text-decoration: none}.${exports.rnds.chr1}{display:none;font-size:0px}${this.div}{display:block}` + exports.css.replace(/\.((?:(?!\[|\d|:|,|\.)\S)+)/g, (m, cl) => '.' + this.css_class(cl)) ], { type: 'text/css' })) });
			
			customElements.define(this.div, class extends HTMLDivElement {}, { extends: 'div' });
			
			this.container = this.add_ele('div', parent.document.body, { className: this.css_class('con') });
			
			this.top_bar = this.add_ele('div', this.container, { innerHTML: exports.chr_ins(data.title), className: this.css_class('bar') + ' ' + this.css_class('bar-top') });
			
			this.cons = this.add_ele('div', this.container, { className: this.css_class('cons') });
			this.sidebar_con = this.add_ele('div', this.cons, { className: this.css_class('sidebar-con' ) });
			
			this.add_ele('div', this.top_bar, { className: this.css_class('ver'), innerHTML: exports.chr_ins('v' + manifest.version) });
			
			this.top_bar.addEventListener('mousedown', () => this.bar_pressed = true);
			
			data.values.forEach((tab, index) => {
				var tab_button = this.add_ele('div', this.sidebar_con, {
						className: this.css_class('tab-button'),
					}),
					tab_ele = this.add_ele('div', this.cons, {
						className: this.css_class('content-con'),
						style: index > 0 ? 'display:none' : '',
					});
				
				this.tabs.push(tab_ele);
				
				tab_button.addEventListener('click', () => (this.tabs.forEach(ele => ele.style.display = 'none'), tab_ele.removeAttribute('style')));
				
				tab_button.innerHTML = exports.chr_ins(tab.name);
				
				if(tab.load)tab.load(tab_ele);
				
				tab.contents.forEach(control => { try{ this.process_controls(control, tab, tab_button, tab_ele) }catch(err){ console.error('Encountered error at %c' + control.name + ' (' + control.val + ')', 'color: #FFF', err) }});
				
				if(tab.bottom_text){
					var bottom_text = tab_ele.appendChild(document.createElement('div'));
					
					bottom_text.className = this.css_class('tab-desc');
					bottom_text.innerHTML = exports.chr_ins(tab.bottom_text);
				}
			});
			
			// add footer last
			this.add_ele('div', this.container, { className: this.css_class('bar'), innerHTML: exports.chr_ins(data.footer) });
			
			setTimeout(() => (this.pos = { x: 20, y: (parent.innerHeight / 2) - (this.container.getBoundingClientRect().height / 2) }, this.apply_bounds()));
		});
	}
	apply_bounds(){
		var size = this.container.getBoundingClientRect();
		
		this.pos.x = Math.min(Math.max(this.pos.x, 0), parent.innerWidth - size.width);
		this.pos.y = Math.min(Math.max(this.pos.y, 0), parent.innerHeight - size.height);
		
		this.container.style.left = this.pos.x + 'px';
		this.container.style.top = this.pos.y + 'px';
	}
};