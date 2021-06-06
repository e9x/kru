'use strict';
// store greasemonkey values before they can be changed
var GM = {
		get_value: typeof GM_getValue == 'function' && GM_getValue,
		set_value: typeof GM_setValue == 'function' && GM_setValue,
		request: typeof GM_xmlhttpRequest == 'function' && GM_xmlhttpRequest,
		fetch: window.fetch.bind(window),
	},
	API = require('./libs/api'),
	Cheat = require('./cheat'),
	Updater = require('./libs/updater'),
	Utils = require('./libs/utils'),
	utils = new Utils(),
	cheat = new Cheat(utils);
	
exports.cheat = cheat;
exports.utils = utils;

exports.script = 'https://raw.githubusercontent.com/e9x/kru/master/sploit.user.js';
exports.github = 'https://github.com/e9x/kru';
exports.discord = 'https://e9x.github.io/kru/invite';

exports.krunker = utils.is_host(location, 'krunker.io', 'browserfps.com') && location.pathname == '/';

exports.api_url = 'https://api.sys32.dev/';
exports.hostname = 'krunker.io';
exports.mm_url = 'https://matchmaker.krunker.io/';

exports.extracted = typeof build_extracted != 'number' ? Date.now() : build_extracted;

exports.store = {
	get: async key => GM.get_value ? await GM.get_value(key) : localStorage.getItem('ss' + key),
	set(key, value){
		if(GM.set_value)return GM.set_value(key, value);
		else return localStorage.setItem('ss' + key, value);
	},
	del(key){
		if(!GM.get_value)localStorage.removeItem('ss' + key);
		else this.set(key, '');
	},
};

exports.request = (url, headers = {}) => new Promise((resolve, reject) => {
	url = new URL(url, location);
	
	if(GM.request)GM.request({
		url: url.href,
		headers: headers,
		onerror: reject,
		onload: res => resolve(res.responseText),
	});
	else GM.fetch(url, { headers: headers }).then(res => res.text()).then(resolve).catch(reject);
});

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

exports.api = new API(exports.mm_url, exports.api_url);

exports.updater = new Updater(exports.script, exports.extracted);