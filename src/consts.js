'use strict';
// store greasemonkey values before they can be changed
var gm = {
	get_value: typeof GM_getValue == 'function' && GM_getValue,
	set_value: typeof GM_setValue == 'function' && GM_setValue,
	request: typeof GM_xmlhttpRequest == 'function' && GM_xmlhttpRequest,
};

exports.script = 'https://raw.githubusercontent.com/e9x/kru/master/sploit.user.js';

exports.extracted = typeof build_extracted != 'number' ? Date.now() : build_extracted;

exports.store = {
	get: async key => gm.get_value ? await gm.get_value(key) : localStorage.getItem('ss' + key),
	set(key, value){
		if(gm.set_value)return gm.set_value(key, value);
		else return localStorage.setItem('ss' + key, value);
	},
};

exports.request = class {
	constructor(url, cache){
		this.url = url + (cache ? '' : '?' + Date.now());
	}
	text(){
		return new Promise((resolve, reject) => gm.request ? gm.request({
			url: this.url,
			onabort: reject,
			onload: details => resolve(details.responseText),
			ontimeout: reject,
			onerror: reject,
		}) : fetch(this.url).then(res => res.text()).then(resolve).catch(reject));
	}
	async json(){
		return JSON.parse(await this.text());
	}
};

// for nwjs client
exports.injected_settings = [];

exports.add_ele = (node_name, parent, attributes) => Object.assign(parent.appendChild(document.createElement(node_name)), attributes);

exports.string_key = key => key.replace(/^(Key|Digit|Numpad)/, '');