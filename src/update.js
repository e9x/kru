var constants = require('./consts.js'),
	check_update = async () => new constants.request.text().then(latest => {
		
		console.log(new Date(parse_headers(latest).extracted).getTime());
		if(constants.extracted >= new Date(parse_headers(await new constants.request.text()).extracted).getTime())return;
		
		clearInterval(update_interval);
		
		if(!confirm('A new sploit version is available, do you wish to update?'))return;
		
		window.open(constants.script);
	}),
	parse_headers = script => {
		var out = {};
		
		script.replace(/\/\/ ==UserScript==\n([\s\S]*?)\n\/\/ ==\/UserScript==/, (match, headers) => headers.split('\n').forEach(line => line.replace(/@(\S+)\s+(.*)/, (match, label, value) => out[label] = label in out ? [].concat(out[label], value) : value)));
		
		return out;
	},
	update_interval = setInterval(check_update, 1000 * 60 * 5); // 5 minutes

check_update();