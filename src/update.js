var constants = require('./consts.js'),
	check_update = async () => constants.request(constants.script).then(latest => {
		
		if(constants.extracted >= new Date(parse_headers(latest).extracted).getTime())return;
		
		clearInterval(update_interval);
		
		if(!confirm('A new sploit version is available, do you wish to update?'))return;
		
		location.assign(constants.script);
	}),
	parse_headers = script => {
		var out = {};
		
		script.replace(/\/\/ ==UserScript==\n([\s\S]*?)\n\/\/ ==\/UserScript==/, (match, headers) => headers.split('\n').forEach(line => line.replace(/@(\S+)\s+(.*)/, (match, label, value) => out[label] = label in out ? [].concat(out[label], value) : value)));
		
		return out;
	},
	update_interval = setInterval(check_update, 1000 * 60 * 3); // 3 minutes

setTimeout(check_update, 2000);