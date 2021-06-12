'use strict';

var DataStore = require('./libs/datastore'),
	API = require('./libs/api'),
	Cheat = require('./cheat'),
	Updater = require('./libs/updater'),
	Utils = require('./libs/utils'),
	utils = new Utils(),
	cheat = new Cheat(utils);

exports.store = new DataStore();

exports.meta = {
	script: 'https://y9x.github.io/userscripts/sploit.user.js',
	github: 'https://github.com/e9x/kru/',
	discord: 'https://y9x.github.io/discord/',
	forum: 'https://forum.sys32.dev/',
};

exports.api_url = 'https://api.sys32.dev/';
exports.mm_url = 'https://matchmaker.krunker.io/';

exports.is_frame = window != window.top;
exports.extracted = typeof build_extracted != 'number' ? Date.now() : build_extracted;

// .htaccess for ui testing
exports.krunker = utils.is_host(location, 'krunker.io', 'browserfps.com') && ['/.htaccess', '/'].includes(location.pathname);

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

var updater = new Updater(exports.meta.script, exports.extracted),
	api = new API(exports.mm_url, exports.api_url, exports.store);

if(!exports.is_frame){
	if(exports.krunker){
		// alerts shown prior to the window load event are cancelled
		if(typeof DO_UPDATES != 'boolean' || DO_UPDATES == true)window.addEventListener('load', () => updater.watch(() => {
			if(confirm('A new Sploit version is available, do you wish to update?'))updater.update();
		}, 60e3 * 3));
		
		api.observe();
	}

	api.license(exports.meta, typeof LICENSE_KEY == 'string' && LICENSE_KEY);
}

exports.cheat = cheat;
exports.utils = utils;
exports.api = api;
exports.updater = updater;