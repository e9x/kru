'use strict';
// store greasemonkey values before they can be changed
var gm = {
	get_value: typeof GM_getValue == 'function' && GM_getValue,
	set_value: typeof GM_setValue == 'function' && GM_setValue,
	request: typeof GM_xmlhttpRequest == 'function' && GM_xmlhttpRequest,
	client_fetch: typeof GM_client_fetch == 'function' && GM_client_fetch,
	fetch: window.fetch.bind(window),
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
	else gm.fetch(url, { headers: headers }).then(res => res.text()).then(resolve).catch(reject);
});

// for nwjs client
exports.injected_settings = [];

exports.add_ele = (node_name, parent, attributes) => Object.assign(parent.appendChild(document.createElement(node_name)), attributes);

exports.crt_ele = (node_name, attributes) => Object.assign(document.createElement(node_name), attributes);

exports.string_key = key => key.replace(/^(Key|Digit|Numpad)/, '');

exports.proxy_addons = [
	{
		name: 'Browser VPN',
		chrome: 'https://chrome.google.com/webstore/detail/ppajinakbfocjfnijggfndbdmjggcmde',
		firefox: 'https://addons.mozilla.org/en-US/firefox/addon/mybrowser-vpn/',
	},
	{
		name: 'Hola VPN',
		chrome: 'https://chrome.google.com/webstore/detail/gkojfkhlekighikafcpjkiklfbnlmeio',
		firefox: 'https://addons.mozilla.org/en-US/firefox/addon/hola-unblocker/',
	},
	{
		name: 'Windscribe',
		chrome: 'https://chrome.google.com/webstore/detail/hnmpcagpplmpfojmgmnngilcnanddlhb',
		firefox: 'https://addons.mozilla.org/en-US/firefox/addon/windscribe/?utm_source=addons.mozilla.org&utm_medium=referral&utm_content=search',
	},
	{
		name: 'UltraSurf',
		chrome: 'https://chrome.google.com/webstore/detail/mjnbclmflcpookeapghfhapeffmpodij',
	},
];

exports.firefox = navigator.userAgent.includes('Firefox');

exports.supported_store = exports.firefox ? 'firefox' : 'chrome';

exports.addon_url = query => exports.firefox ? 'https://addons.mozilla.org/en-US/firefox/search/?q=' + encodeURIComponent(query) : 'https://chrome.google.com/webstore/search/' + encodeURI(query);