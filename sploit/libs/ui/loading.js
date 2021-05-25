'use strict';

var { frame, utils } = require('./consts');

class Loading {
	constructor(visible){
		this.node = utils.add_ele('div', frame.contentWindow.document.documentElement, { className: 'loading' });
		this.visible = visible;
		this.update();
	}
	show(){
		this.visible = true;
		this.update();
	}
	hide(){
		this.visible = false;
		this.update();
	}
	blur(){}
	focus(){}
	update(){
		this.node.style.opacity = this.visible ? 1 : 0;
		this.node.style['pointer-events'] = this.visible ? 'all' : 'none';
	}
};

module.exports = Loading;