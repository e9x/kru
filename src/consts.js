'use strict';
// store greasemonkey values before they can be changed
var gm = {
	get_value: typeof GM_getValue == 'function' && GM_getValue,
	set_value: typeof GM_setValue == 'function' && GM_setValue,
	request: typeof GM_xmlhttpRequest == 'function' && GM_xmlhttpRequest,
	client_fetch: typeof GM_client_fetch == 'function' && GM_client_fetch,
	fetch: fetch,
};

exports.script = 'https://raw.githubusercontent.com/e9x/kru/master/sploit.user.js';
exports.github = 'https://github.com/e9x/kru';
exports.discord = 'https://e9x.github.io/kru/invite';

exports.extracted = typeof build_extracted != 'number' ? Date.now() : build_extracted;

exports.store = {
	get: async key => gm.get_value ? await gm.get_value(key) : localStorage.getItem('ss' + key),
	set(key, value){
		if(gm.set_value)return gm.set_value(key, value);
		else return localStorage.setItem('ss' + key, value);
	},
	del(key){
		if(!gm.get_value)localStorage.removeItem('ss' + key);
		else this.set(key, '');
	},
};

exports.request = (url, headers = {}) => new Promise((resolve, reject) => {
	url = new URL(url, location);
	
	if(gm.request)gm.request({
		url: url.href,
		headers: headers,
		onerror: reject,
		onload: res => resolve(res.responseText),
	});
	else (gm.client_fetch ? gm.client_fetch(url, headers) : gm.fetch(url, { headers: headers }).then(res => res.text())).then(resolve).catch(reject);
});

// for nwjs client
exports.injected_settings = [];

exports.add_ele = (node_name, parent, attributes) => Object.assign(parent.appendChild(document.createElement(node_name)), attributes);

exports.string_key = key => key.replace(/^(Key|Digit|Numpad)/, '');