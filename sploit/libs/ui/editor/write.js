'use strict';

var { utils } = require('../consts'),
	Events = require('./events.js');

class Write extends Events {
	constructor(parent){
		super();
		
		this.container = utils.add_ele('div', parent, { className: 'write' });
		this.linenums = utils.add_ele('div', this.container, { className: 'linenums' });
		this.node = utils.add_ele('textarea', this.container, {
			className: 'text',
			spellcheck: false,
		});
		
		utils.add_ele('style', parent, { textContent: require('./write.css') });
		
		this.node.addEventListener('input', () => {
			this.update();
			this.emit('change');
		});
		
		this.node.addEventListener('keydown', event => {
			if(event.ctrlKey)this.emit('ctrl+' + event.key.toLowerCase());
			
			if(event.key == 'Tab')this.insertAtCaret('\t'), event.preventDefault();
		});
		
		this.update();
	}
	getValue(){
		return this.node.value;
	}
	setValue(value){
		this.node.value = value;
		this.update();
	}
	update(){
		this.node.style.height = '5px';
		this.node.style.height = this.node.scrollHeight + 'px';
		this.linenums.textContent = this.node.value.split('\n').map((x, index) => index + 1).join('\n');
	}
	insertAtCaret(text = ''){
		if(this.node.selectionStart || this.node.selectionStart == 0){
			var startPos = this.node.selectionStart;
			var endPos = this.node.selectionEnd;
			this.node.value = this.node.value.substring(0, startPos) + text + this.node.value.substring(endPos, this.node.value.length);
			this.node.selectionStart = startPos + text.length;
			this.node.selectionEnd = startPos + text.length;
		}else this.node.value += text;
		
		this.emit('change');
	}
}

module.exports = Write;