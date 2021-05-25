'use strict';

var { keybinds, utils } = require('../consts');

class Control {
	constructor(data, section, ui){
		this.data = data;
		this.name = this.data.name;
		this.ui = ui;
		this.container = utils.add_ele('div', section.node, { className: 'control' });
		this.button = utils.add_ele('div', this.container, { className: 'toggle' });
		this.label = utils.add_ele('div', this.container, { className: 'label' });
		this.button.addEventListener('click', () => (this.interact(), this.update()));
		
		var self = this;
		
		keybinds.push({
			get code(){ return [ self.key ] },
			interact: () => {
				if(!this.data.menu_hidden && !this.ui.visible)return;
				
				this.interact();
				this.update();
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
		this.button.textContent = '[' + (this.key ? utils.string_key(this.key) : '-') + ']';
		this.label.textContent = this.name;
	}
};

module.exports = Control;