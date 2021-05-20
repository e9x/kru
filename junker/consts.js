'use strict';
// store greasemonkey values before they can be changed
var gm = {
	get_value: typeof GM_getValue == 'function' && GM_getValue,
	set_value: typeof GM_setValue == 'function' && GM_setValue,
	request: typeof GM_xmlhttpRequest == 'function' && GM_xmlhttpRequest,
	client_fetch: typeof GM_client_fetch == 'function' && GM_client_fetch,
	fetch: window.fetch.bind(window),
};

exports.script = 'https://raw.githubusercontent.com/e9x/kru/master/junker.user.js';
exports.github = 'https://github.com/e9x/kru';
exports.discord = 'https://e9x.github.io/kru/invite';

exports.extracted = typeof build_extracted != 'number' ? Date.now() : build_extracted;

exports.api_url = 'https://api.sys32.dev/';
exports.hostname = 'krunker.io';
exports.mm_url = 'https://matchmaker.krunker.io/';