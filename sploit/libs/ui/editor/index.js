'use strict';

var { utils } = require('../consts'),
	PanelDraggable = require('../paneldraggable'),
	Tab = require('./tab'),
	svg = require('./svg.json'),
	Codemirror = require('codemirror'),
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
	};

class Editor extends PanelDraggable {
	constructor(data){
		super(data, 'editor');
		
		this.sheet = utils.add_ele('style', document.documentElement);
		
		this.title = utils.add_ele('div', this.node, { textContent: data.title, className: 'title' });
		
		this.actions = this.listen_dragging(utils.add_ele('div', this.title, { className: 'actions' }));
		
		this.actions.insertAdjacentHTML('beforeend', svg.add_file);
		this.actions.lastElementChild.addEventListener('click', async () => new Tab(await this.write_data(gen_uuid(), { name: 'new.css', active: true, value: '' }), this).focus());
		
		this.actions.insertAdjacentHTML('beforeend', svg.web);
		this.actions.lastElementChild.addEventListener('click', () => exports.prompt('Enter a CSS link').then(input => utils.request(input).then(async style => {
			var name = input.split('/').slice(-1)[0];
			
			new Tab(await this.write_data(gen_uuid(), { name: name, active: true, value: style }), this).focus();
		}).catch(err => (exports.alert('Loading failed: ' + err), 1))));
		
		this.actions.insertAdjacentHTML('beforeend', svg.save);
		this.saven = this.actions.lastElementChild;
		
		this.saven.addEventListener('click', () => this.save_doc());
		
		this.actions.insertAdjacentHTML('beforeend', svg.reload);
		this.actions.lastElementChild.addEventListener('click', () => this.load());
		
		utils.add_ele('div', this.actions, { textContent: '?', className: 'help button' }).addEventListener('click', event => exports.alert([
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
			`<p>For further help, ask our support team in the Discord server by <a target="_blank" href="${utils.discord}">clicking here</a><p>`,
		].join('')));
		
		utils.add_ele('div', this.actions, { className: 'hide button' }).addEventListener('click', event => this.hide());
		
		this.tab_con = utils.add_ele('div', this.title, { className: 'tabs' });
		
		this.tabs = [];
		
		data.tabs.forEach(uuid => new Tab(uuid, this));
		
		this.mirror = new Codemirror(this.node, {
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
		
		this.footer = utils.add_ele('footer', this.node, { className: 'left' });
		
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
		
		this.footer.innerHTML = this.saved == null ? 'Editor loaded' : this.saved ? 'All changes saved' : `Warning: unsaved changes, press the ${svg.save} icon`;
		
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

module.exports = Editor;