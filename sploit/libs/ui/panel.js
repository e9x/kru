'use strict';

var { frame, panels, utils } = require('./consts');

class Panel {
	constructor(data, type = ''){
		this.data = data;
		this.type = type;
		this.visible = true;
		this.hover = true;
		this.node = utils.add_ele('main', frame.contentWindow.document.documentElement, { className: type });
		
		panels.push(this);
		
		this.node.addEventListener('mousedown', () => this.focus());
		frame.contentWindow.addEventListener('blur', () => this.blur());
	}
	focus(){
		for(var panel of panels)panel.blur();
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

module.exports = Panel;