'use strict';

var { utils } = require('../consts'),
	svg = require('./svg');

class Tab {
	static ID(){
		return Math.random().toString();
	}
	constructor(uuid, ui){
		this.ui = ui;
		
		if(!uuid)throw new Error('Bad UUID');
		
		this.uuid = uuid;
		
		this.focused = false;
		
		this.node = utils.add_ele('div', ui.tab_con, { className: 'tab' });
		
		this.namen = utils.add_ele('div', this.node, { className: 'name' });
		
		this.node.insertAdjacentHTML('beforeend', svg.rename);
		
		this.node.lastElementChild.addEventListener('click', event => {
			event.stopImmediatePropagation();
			this.rename_input.textContent = this.name;
			this.node.classList.add('rename');
			this.rename_input.focus();
		});
		
		this.activen = utils.add_ele('div', this.node, { className: 'active' });
		
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
		
		this.rename_input = utils.add_ele('span', this.node, { className: 'rename-input' });
		
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
		this.ui.editor.setValue(data.value);
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

module.exports = Tab;