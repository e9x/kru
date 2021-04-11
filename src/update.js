var latest_script = 'https://raw.githubusercontent.com/e9x/kru/master/sploit.user.js',
	check_update = async () => {
		if(build_extracted >= new Date(parse_headers(await fetch(latest_script).then(res => res.text())).extracted).getTime())return;
		
		clearInterval(update_interval);
		
		if(!confirm('A new sploit version is available, do you wish to update?'))return;
		
		window.open(latest_script);
	},
	parse_headers = script => {
		var out = {};

		script.replace(/\/\/ ==UserScript==\n([\s\S]*?)\n\/\/ ==\/UserScript==/, (match, headers) => headers.split('\n').forEach(line => line.replace(/@(\S+)\s+(.*)/, (match, label, value) => out[label] = label in out ? [].concat(out[label], value) : value)));

		return out;
	},
	update_interval = setInterval(check_update, 1000 * 60 * 5); // 5 minutes

check_update();