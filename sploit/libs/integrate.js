'use strict';


var Utils = require('./utils'),
	utils = new Utils();

exports.has_instruct = (...ors) => {
	var instruction = exports.instruction_holder ? exports.instruction_holder.textContent.trim().toLowerCase() : '';
	
	return ors.some(check => instruction.includes(check));
};

exports.listen_load = instruct_cb => new Promise(resolve => new MutationObserver((muts, observer) => muts.forEach(mut => [...mut.addedNodes].forEach(node => {
	if(node.tagName == 'DIV' && node.id == 'instructionHolder'){
		exports.instruction_holder = node;
		
		new MutationObserver(() => setTimeout(instruct_cb, 200)).observe(exports.instruction_holder, {
			attributes: true,
			attributeFilter: [ 'style' ],
		});
	}
	
	if(node.tagName == 'SCRIPT' && node.textContent.includes('Yendis Entertainment')){
		node.textContent = '';
		resolve();
	}
}))).observe(document, { childList: true, subtree: true })).then(() => utils.wait_for(() => window.Howler));

document.addEventListener('pointerlockchange', () => {
	exports.focused = document.pointerLockElement != null;
});

exports.inputs = {};

window.addEventListener('keydown', event => exports.inputs[event.code] = true);
window.addEventListener('keyup', event => exports.inputs[event.code] = false);
window.addEventListener('blur', event => exports.inputs = {});

console.log(window);