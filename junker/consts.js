'use strict';

var Utils = require('../sploit/libs/utils'),
	utils = new Utils();

exports.script = 'https://raw.githubusercontent.com/e9x/kru/master/junker.user.js';
exports.github = 'https://github.com/e9x/kru';
exports.discord = 'https://e9x.github.io/kru/invite';

exports.krunker = utils.is_host(location, 'krunker.io', 'browserfps.com') && location.pathname == '/';

exports.extracted = typeof build_extracted != 'number' ? Date.now() : build_extracted;

exports.api_url = 'https://api.sys32.dev/';
exports.hostname = 'krunker.io';
exports.mm_url = 'https://matchmaker.krunker.io/';