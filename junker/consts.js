'use strict';

var Utils = require('../sploit/libs/utils'),
	API = require('../sploit/libs/api'),
	Updater = require('../sploit/libs/updater.js'),
	Main = require('./main'),
	utils = new Utils();

exports.meta = {
	script: 'https://raw.githubusercontent.com/e9x/kru/master/junker.user.js',
	github: 'https://github.com/e9x/kru',
	discord: 'https://y9x.github.io/discord/',
	forum: 'https://forum.sys32.dev',
};

exports.krunker = utils.is_host(location, 'krunker.io', 'browserfps.com') && location.pathname == '/';

exports.api_url = 'https://api.sys32.dev/';
exports.mm_url = 'https://matchmaker.krunker.io/';

exports.extracted = typeof build_extracted != 'number' ? Date.now() : build_extracted;

var main = new Main(exports.meta),
	updater = new Updater(exports.meta.script, exports.extracted),
	api = new API(exports.mm_url, exports.api_url);

if(exports.krunker)api.observe();

api.license(exports.meta);

exports.main = main
exports.utils = utils;
exports.api = api;
exports.updater = updater;