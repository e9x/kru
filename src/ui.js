'use strict';
var svg = require('./svg.json'),
	constants = require('./consts'),
	codemirror = require('codemirror'),
	gen_uuid = () => {
		var lut = [...Array(256)].map((x, ind) => ind.toString(16).padStart(2, 0)),
			d0 = Math.random()*0xffffffff|0,
			d1 = Math.random()*0xffffffff|0,
			d2 = Math.random()*0xffffffff|0,
			d3 = Math.random()*0xffffffff|0;
		
		return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
		lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
		lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
		lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
	},
	frame = constants.crt_ele('iframe', { style: 'top:0;left:0;z-index:9000000;border:none;position:absolute;background:#0000;width:100vw;height:100vh;pointer-events:none' }),
	keybinds = [],
	inputs = {},
	panels = [],
	doc_input_active = doc => doc.activeElement && ['TEXTAREA', 'INPUT'].includes(doc.activeElement.tagName),
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
		canvas.width = frame.contentWindow.innerWidth;
		canvas.height = frame.contentWindow.innerHeight;
	},
	global_listen = (event, callback, options) => {
		window.addEventListener(event, callback, options);
		frame.contentWindow.addEventListener(event, callback, options);
	},
	canvas;

exports.ready = new Promise(resolve => frame.addEventListener('load', () => resolve()));

exports.ready.then(() => {
	canvas = exports.canvas = constants.add_ele('canvas', frame.contentWindow.document.documentElement);
	
	var ctx = exports.ctx = canvas.getContext('2d', { alpha: true });
	
	resize_canvas();

	frame.contentWindow.document.head.remove();
	frame.contentWindow.document.body.remove();

	global_listen('mousemove', update_pe);
	global_listen('mousedown', update_pe);
	global_listen('mouseup', update_pe);
	
	global_listen('keydown', event => {
		if(event.repeat || doc_input_active(document) || doc_input_active(frame.contentWindow.document))return;
		
		inputs[event.code] = true;
		
		// some(keycode => typeof keycode == 'string' && [ keycode, keycode.replace('Digit', 'Numpad') ]
		keybinds.forEach(keybind => keybind.code.includes(event.code) && event.preventDefault() + keybind.interact());
	});

	global_listen('keyup', event => inputs[event.code] = false);

	frame.contentWindow.addEventListener('contextmenu', event => !(event.target != null && event.target instanceof frame.contentWindow.HTMLTextAreaElement) && event.preventDefault());

	window.addEventListener('blur', () => inputs = exports.inputs = {});
	window.addEventListener('resize', resize_canvas);

	constants.add_ele('style', frame.contentWindow.document.documentElement, { textContent: [
		require('./ui.css'),
		require('codemirror/theme/solarized.css'),
		require('codemirror/lib/codemirror.css'),
	].join('\n') });

	require('codemirror/mode/css/css.js');
});

document.documentElement.appendChild(frame);

class Panel {
	constructor(data, type = ''){
		this.data = data;
		this.type = type;
		this.visible = true;
		this.hover = true;
		this.node = constants.add_ele('main', frame.contentWindow.document.documentElement, { className: type });
		
		panels.push(this);
		
		this.node.addEventListener('mousedown', () => this.focus());
		frame.contentWindow.addEventListener('blur', () => this.blur());
	}
	focus(){
		panels.forEach(panel => panel.blur());
		this.node.classList.add('focus');
		this.node.style['z-index'] = 2;
	}
	blur(){
		this.node.classList.remove('focus');
		this.node.style['z-index'] = 1;
	}
	show(){
		this.visible = true;
		this.node.style.opacity = '';
		this.node.style['pointer-events'] = '';
	}
	hide(){
		this.visible = false;
		this.node.style.opacity = 0;
		this.node.style['pointer-events'] = 'none';
	}
	remove(){
		panels.splice(panels.indexOf(this), 1);
		this.hide();
		this.node.remove();
	}
	fix_center(){
		Object.assign(this.node.style, { margin: 'auto', left: 0, right: 0, top: 0, bottom: 0 });
	}
};

class PanelDraggable extends Panel {
	constructor(data, type){
		super(data, type);
		this.pos = { x: 0, y: 0 };
		
		window.addEventListener('resize', () => this.apply_bounds());
		
		global_listen('mousemove', event => {
			var pos = { x: event.pageX, y: event.pageY };
			
			if(this.prev_pos && this.dragging){
				this.pos.x += (pos.x - this.prev_pos.x)/this.bounds().width*100;
				this.pos.y += (pos.y - this.prev_pos.y)/this.bounds().height*100;
				this.save_ui();
				this.apply_bounds();
			}
			
			this.prev_pos = pos;
		});
		
		global_listen('mouseup', () => {
			if(!this.dragging)return;
			this.pos = this.within_bounds();
			this.apply_bounds();
			this.dragging = false;
		});
	}
	async load_ui_data(){
		var data = await this.load_ui();
		
		this.pos = data.pos;
		this.visible = data.visible;
		
		if(this.visible)this.show();
		else this.hide();
		
		this.apply_bounds();
	}
	async save_ui(only_visible){
		if(!(['editor', 'config'].includes(this.type)))return;
		
		var pos = only_visible ? (await this.load_ui().catch(err => this)).pos : this.pos;
		
		return this.data.store.set(this.type + '-ui', +this.visible + ',' + this.pos.x + ',' + this.pos.y);
	}
	async load_ui(){
		var data = await this.data.store.get(this.type + '-ui');
		
		if(!data)return this;
		
		var arr = data.split(',');
		
		return {
			pos: { x: +arr[1], y: +arr[2] },
			visible: !!+arr[0],
		};
	}
	listen_dragging(node){
		node.addEventListener('mousedown', () => this.dragging = true);
		
		return node;
	}
	center_side(side){
		var rect = this.node.getBoundingClientRect();
		
		return 50-rect[side]/this.bounds()[side]*50;
	}
	bounds(){
		return { width: window.innerWidth, height: window.innerHeight };
	}
	within_bounds(){
		var rect = this.node.getBoundingClientRect();
		
		return {
			x: Math.min(
				Math.max(this.pos.x, 0),
				100-(rect.width/this.bounds().width*100)
			),
			y: Math.min(
				Math.max(this.pos.y, 0),
				100-(rect.height/this.bounds().height*100)
			),
		};
	}
	apply_bounds(){
		var bounds = this.within_bounds();
		
		this.node.style.left = bounds.x.toFixed(1) + '%';
		this.node.style.top = bounds.y.toFixed(1) + '%';
	}
	show(){
		// this.focus();
		
		super.show();
		
		this.save_ui(true);
	}
	hide(){
		super.hide();
		
		this.save_ui(true);
	}
}

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
		
		keybinds.push({
			get code(){ return [ self.key ] },
			interact(){
				if(!self.ui.visible)return;
				
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
		
		data.split('.').forEach(key => state = ((last_state = state)[last_key = key] || {}));
		
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
}

class Config extends PanelDraggable {
	constructor(data){
		super(data, 'config');
		
		this.config = this.data.config;
		
		this.title = this.listen_dragging(constants.add_ele('div', this.node, { textContent: data.title, className: 'title' }));
		
		constants.add_ele('div', this.title, { className: 'version', textContent: 'v' + data.version });
		
		this.sections_con = constants.add_ele('div', this.node, { className: 'sections' });
		this.sidebar_con = constants.add_ele('div', this.sections_con, { className: 'sidebar' });
		
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
				node: constants.add_ele('section', this.sections_con),
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
		
		setTimeout(() => {
			this.pos = { x: 1, y: this.center_side('height') };
			this.apply_bounds();
			this.load_ui_data();
		});
		
		this.footer = constants.add_ele('footer', this.node);
	}
	async update(load){
		if(load)await this.config.load();
		
		this.apply_bounds();
		
		this.sections.forEach(section => section.hide());
		this.sections[this.config.value.ui_page].show();
		
		this.toggle_bind.code = [ 'F1', this.config.value.binds.toggle ];
		
		this.footer.textContent = `Press ${this.toggle_bind.code.map(constants.string_key).map(x => '[' + x + ']').join(' or ')} to toggle`;
		
		this.sections.forEach(section => section.controls.forEach(control => control.update()));
	}
};

class Tab {
	constructor(uuid, ui){
		this.ui = ui;
		
		if(!uuid)throw new Error('bad UexportsD');
		
		this.uuid = uuid;
		
		this.focused = false;
		
		this.node = constants.add_ele('div', ui.tab_con, { className: 'tab' });
		
		this.namen = constants.add_ele('div', this.node, { className: 'name' });
		
		this.node.insertAdjacentHTML('beforeend', svg.rename);
		
		this.node.lastElementChild.addEventListener('click', event => {
			event.stopImmediatePropagation();
			this.rename_input.textContent = this.name;
			this.node.classList.add('rename');
			this.rename_input.focus();
		});
		
		this.activen = constants.add_ele('div', this.node, { className: 'active' });
		
		this.activen.addEventListener('click', async () => {
			this.active = !this.active;
			
			var data = await this.data();
			
			await this.write_data({
				name: data.name,
				active: !data.active,
				value: data.value,
			});
			
			await this.update();
			
			this.ui.load();
		});
		
		this.node.insertAdjacentHTML('beforeend', svg.close);
		
		this.node.lastElementChild.addEventListener('click', event => {
			event.stopImmediatePropagation();
			this.remove();
		});
		
		this.rename_input = constants.add_ele('span', this.node, { className: 'rename-input' });
		
		this.rename_input.setAttribute('contenteditable', '');
		
		this.rename_input.addEventListener('keydown', event => {
			if(event.code == 'Enter')event.preventDefault(), this.rename_input.blur();
		});
		
		this.rename_input.addEventListener('blur', () => {
			this.node.classList.remove('rename');
			this.rename(this.rename_input.textContent);
			this.rename_input.textContent = '';
		});
		
		this.node.addEventListener('click', () => this.focus());
		
		this.update();
		
		this.ui.tabs.push(this);
		this.ui.save();
	}
	async data(){
		var read = await this.ui.data.store.get(this.uuid),
			name_end = read.indexOf(' ');
		
		return {
			name: decodeURIComponent(read.slice(name, name_end)),
			// string => number => bool
			active: !!+read.slice(name_end + 1, name_end + 2),
			value: read.slice(name_end + 2) || '',
		};
	}
	async write_data(data){
		await this.ui.write_data(this.uuid, data);
	}
	async rename(name){
		if(!name.replace(/\s/g, '').length)return;
		
		var data = await this.data();
		
		await this.write_data({
			name: this.namen.textContent = name,
			active: data.active,
			value: data.value,
		});
		
		await this.update();
	}
	async update(){
		var data = await this.data();
		
		this.namen.textContent = data.name;
		this.activen.className = 'active ' + data.active;
		this.ui.save();
	}
	async focus(){
		if(this.focused)return;
		
		var data = await this.data();
		
		this.ui.tabs.forEach(tab => tab.blur());
		this.focused = true;
		this.node.classList.add('active');
		this.ui.mirror.setValue(data.value);
		this.ui.saved = true;
		this.ui.update();
	}
	blur(){
		this.focused = false;
		this.node.classList.remove('active');
	}
	async remove(){
		this.node.remove();
		this.ui.data.store.del(this.name);
		this.ui.tabs.splice(this.ui.tabs.indexOf(this), 1);
		this.ui.focus_first();
		await this.ui.data.store.set(this.uuid, '');
		this.ui.save();
	}
};

class Editor extends PanelDraggable {
	constructor(data){
		super(data, 'editor');
		
		this.sheet = constants.add_ele('style', document.documentElement);
		
		this.title = constants.add_ele('div', this.node, { textContent: data.title, className: 'title' });
		
		this.actions = this.listen_dragging(constants.add_ele('div', this.title, { className: 'actions' }));
		
		this.actions.insertAdjacentHTML('beforeend', svg.add_file);
		this.actions.lastElementChild.addEventListener('click', async () => new Tab(await this.write_data(gen_uuid(), { name: 'new.css', active: true, value: '' }), this).focus());
		
		this.actions.insertAdjacentHTML('beforeend', svg.web);
		this.actions.lastElementChild.addEventListener('click', () => exports.prompt('Enter a CSS link').then(input => constants.request(input).then(async style => {
			var name = input.split('/').slice(-1)[0];
			
			new Tab(await this.write_data(gen_uuid(), { name: name, active: true, value: style }), this).focus();
		}).catch(err => (exports.alert('Loading failed: ' + err), 1))));
		
		this.actions.insertAdjacentHTML('beforeend', svg.save);
		this.saven = this.actions.lastElementChild;
		
		this.saven.addEventListener('click', () => this.save_doc());
		
		this.actions.insertAdjacentHTML('beforeend', svg.reload);
		this.actions.lastElementChild.addEventListener('click', () => this.load());
		
		constants.add_ele('div', this.actions, { textContent: '?', className: 'help button' }).addEventListener('click', event => exports.alert([
			`<h3>Glossary:</h3><ul>`,
				`<li>Menu bar - set of buttons found in the top left of the panel.</li>`,
			`</ul>`,
			`<h3>What does this menu do?</h3>`,
			`<p>This is a CSS manager/ide for Krunker.</p>`,
			`<h3>How do I add my CSS?</h3>`,
			`<p>1. Press the ${svg.web} button found in the menu bar.</p>`,
			`<p>2. In the new window, input the link to your CSS then press OK.</p>`,
			`<p>3. Reload by pressing the ${svg.reload} button in the menu bar.</p>`,
			`<h3>How do I manually add CSS?</h3>`,
			`<p>1. Create a new file with the ${svg.add_file} button found in the top right of the CSS manager.<p>`,
			`<p>2. In the text editor, input your CSS.<p>`,
			`<p>3. When you are finished, press the ${svg.save} button to save changes.<p>`,
			`<p>4. Reload by pressing the ${svg.reload} button in the menu bar.</p>`,
			'<h3>How do I turn on/off my CSS?</h3>',
			`<p>Pressing the square icon in your CSS's tab will toggle the visibility. When the square is filled, the tab is enabled, when the square is empty, the tab is disabled.<p>`,
			'<h3>How do I rename my CSS?</h3>',
			`<p>Pressing the ${svg.rename} icon in your CSS's tab will change the tab to renaming mode. Type in the new name then press enter to save changes.<p>`,
			'<h3>How do I remove my CSS?</h3>',
			`<p>Pressing the ${svg.close} icon in your CSS's tab will remove your CSS.<p>`,
			`<p>For further help, ask our support team in the Discord server by <a target="_blank" href="${constants.discord}">clicking here</a><p>`,
		].join('')));
		
		constants.add_ele('div', this.actions, { className: 'hide button' }).addEventListener('click', event => this.hide());
		
		this.tab_con = constants.add_ele('div', this.title, { className: 'tabs' });
		
		this.tabs = [];
		
		data.tabs.forEach(uuid => new Tab(uuid, this));
		
		this.mirror = codemirror(this.node, {
			mode: 'css',
			lineWrapping: true,
			indentWithTabs: true,
			theme: 'solarized',
			lineNumbers: true,
		});
		
		this.mirror.on('change', () => {
			this.saved = false;
			this.update();
		});
		
		this.editor = this.node.lastElementChild;
		
		this.footer = constants.add_ele('footer', this.node, { className: 'left' });
		
		this.update();
		this.focus_first();
		this.load();
		
		this.pos = { x: this.center_side('width'), y: this.center_side('height') };
		this.apply_bounds();
		this.load_ui_data();
		
		
		this.hide();
	}
	async focus_first(){
		var tab = this.tabs[0];
		
		if(!tab)tab = new Tab(await this.write_data(gen_uuid(), { name: 'new.css', active: true, value: '' }), this);
		
		tab.focus();
	}
	async write_data(uuid, data){
		await this.data.store.set(uuid, encodeURIComponent(data.name) + ' ' + +data.active + data.value);
		
		return uuid;
	}
	update(){
		this.saven.classList[this.saved ? 'add' : 'remove']('saved');
		
		this.footer.textContent = this.saved == null ? 'Editor loaded' : this.saved ? 'All changes saved' : 'Warning: unsaved changes, press the SAVE icon';
		
		this.apply_bounds();
	}
	save(){
		this.data.save(this.tabs.map(tab => tab.uuid));
	}
	async save_doc(){
		this.saved = true;
		this.tabs.forEach(tab => tab.focused && tab.data().then(data => tab.write_data({ name: data.name, active: data.active, value: this.mirror.getValue() })));
		await this.update();
		await this.load();
	}
	async load(){
		this.sheet.textContent = '';
		
		for(var ind in this.tabs){
			var data = await this.tabs[ind].data();
			
			if(data.active)this.sheet.textContent += data.value + '\n';
		}
	}
};

exports.Config = Config;
exports.Tab = Tab;
exports.Editor = Editor;
exports.keybinds = keybinds;
exports.inputs = inputs;

exports.alert = desc => {
	var panel = new Panel({}, 'prompt');
	
	panel.fix_center();
	
	constants.add_ele('div', panel.node, { innerHTML: desc, className: 'description' });
	
	var form = constants.add_ele('form', panel.node);
	
	constants.add_ele('button', form, { textContent: 'OK', className: 'submit single' });
	
	panel.focus();
	
	return new Promise(resolve => form.addEventListener('submit', event => (event.preventDefault(), panel.remove(), resolve()), { once: true }));
};

exports.prompt = desc => {
	var panel = new Panel({}, 'prompt');
	
	panel.fix_center();
	
	constants.add_ele('div', panel.node, { textContent: desc, className: 'description' });
	
	var form = constants.add_ele('form', panel.node),
		input = constants.add_ele('input', form, { className: 'input' });
	
	constants.add_ele('button', form, { textContent: 'OK', className: 'submit' });
	
	var cancel = constants.add_ele('button', form, { textContent: 'Cancel', className: 'cancel' });
	
	panel.focus();
	
	return new Promise((resolve, reject) => form.addEventListener('submit', event => {
		event.preventDefault();
		
		(event.submitter == cancel ? reject : resolve)(input.value);
		
		panel.remove();
	}));
};

exports.options = (title, options) => {
	var panel = new Panel({}, 'options'),
		title = constants.add_ele('div', panel.node, { textContent: title, className: 'title' });
	
	panel.fix_center();
	
	panel.focus();
	
	return new Promise(resolve => {
		options.forEach((option, index) => constants.add_ele('div', panel.node, { className: 'control', textContent: option[0] }).addEventListener('click', () => (panel.hide(), resolve(option[1]))));
	});
};