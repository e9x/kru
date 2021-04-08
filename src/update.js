var latest_script = 'https://raw.githubusercontent.com/e9x/kru/master/sploit.user.js';

var update_interval = setInterval(async () => {
	var latest_headers = {};
	
	await fetch(latest_script).then(res => res.text()).then(script => script.replace(/(?<=\/\/ ==UserScript==\n[\s\S]*?)@(\S+)\s+(.*\n)(?=[\s\S]*?\/\/ ==\/UserScript==)/g, (match, label, value) => latest_headers[label] = label in latest_headers ? [].concat(latest_headers[label], value) : value));
	
	if(build_extracted >= new Date(latest_headers.extracted).getTime())return;
	
	clearInterval(update_interval);
	
	if(!confirm('A new sploit version is available, do you wish to update?'))return;
	
	window.open(latest_script);
}, 3000);