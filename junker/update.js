var constants = require('./consts.js'),
	parse_headers = script => {
		var out = {};
		
		script.replace(/\/\/ ==UserScript==\n([\s\S]*?)\n\/\/ ==\/UserScript==/, (match, headers) => headers.split('\n').forEach(line => line.replace(/@(\S+)\s+(.*)/, (match, label, value) => out[label] = label in out ? [].concat(out[label], value) : value)));
		
		return out;
	},
	check_update = async () => constants.request(constants.script).then(latest => {
		// if updated, wait 3 minutes
		if(constants.extracted >= new Date(parse_headers(latest).extracted).getTime())return setTimeout(check_update, 60e3 * 3);
		
		if(!confirm('A new Junker version is available, do you wish to update?'))return;
		
		location.assign(constants.script);
	}).catch(console.error);

window.addEventListener('load', check_update);