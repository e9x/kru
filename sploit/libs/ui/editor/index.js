'use strict';

var { utils } = require('../consts'),
	PanelDraggable = require('../paneldraggable'),
	Tab = require('./tab'),
	svg = require('./svg.json'),
	Write = require('./write'),
	{ alert, prompt } = require('../actions');

class Editor extends PanelDraggable {
	constructor(data){
		super(data, 'editor');
		
		this.sheet = utils.add_ele('style', document.documentElement);
		
		this.title = utils.add_ele('div', this.node, { textContent: data.title, className: 'title' });
		
		this.actions = this.listen_dragging(utils.add_ele('div', this.title, { className: 'actions' }));
		
		this.actions.insertAdjacentHTML('beforeend', svg.add_file);
		this.actions.lastElementChild.addEventListener('click', async () => new Tab(await this.write_data(Tab.ID(), { name: 'new.css', active: true, value: '' }), this).focus());
		
		this.actions.insertAdjacentHTML('beforeend', svg.web);
		this.actions.lastElementChild.addEventListener('click', () => prompt('Enter a CSS link', 'https://').then(async input => {
			var style = await(await fetch(input)).text(),
				name = input.split('/').slice(-1)[0];
			
			new Tab(await this.write_data(Tab.ID(), { name: name, active: true, value: style }), this).focus();
		}).catch(err => (alert('Loading failed: ' + err), 1)));
		
		this.actions.insertAdjacentHTML('beforeend', svg.save);
		this.saven = this.actions.lastElementChild;
		
		this.saven.addEventListener('click', () => this.save_doc());
		
		this.actions.insertAdjacentHTML('beforeend', svg.reload);
		this.actions.lastElementChild.addEventListener('click', () => this.load());
		
		data.help = data.help.replace(/svg\.(\w+)/g, (match, prop) => svg[prop]);
		
		utils.add_ele('div', this.actions, { textContent: '?', className: 'help button' }).addEventListener('click', event => alert(data.help));
		
		utils.add_ele('div', this.actions, { className: 'hide button' }).addEventListener('click', event => this.hide());
		
		this.tab_con = utils.add_ele('div', this.title, { className: 'tabs' });
		
		this.tabs = [];
		
		data.tabs.forEach(uuid => new Tab(uuid, this));
		
		this.editor = new Write(this.node);
		
		this.editor.on('ctrl+s', () => this.save_doc());
		this.editor.on('ctrl+r', () => this.load());
		
		this.editor.on('change', () => {
			this.saved = false;
			this.update();
		});
		
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
		
		if(!tab)tab = new Tab(await this.write_data(Tab.ID(), { name: 'new.css', active: true, value: '' }), this);
		
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
		this.tabs.forEach(tab => tab.focused && tab.data().then(data => tab.write_data({ name: data.name, active: data.active, value: this.editor.getValue() })));
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