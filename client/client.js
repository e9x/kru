// get-process | where-object { $_.path -like '*nwjs*' } | stop-process; node E:\sys\kru\client
'use strict';

/*window.addEventListener('error', event => alert(`Uncaught exception\nScript: ${event.filename}
Line: ${event.lineno}
Char: ${event.colno}
Error: ${event.error instanceof Error ? event.error.type : event.error}
Code: ${event.error instanceof Error ? event.error.code : ''}
Stack:
${(event.error instanceof Error ? event.error : new Error()).stack}`));*/

var ws = require('ws'),
	os = require('os'),
	fs = require('fs'),
	mod = require('module'),
	util = require('util'),
	path = require('path'),
	https = require('https'),
	child_process = require('child_process'),
	screen = nw.Screen.screens[0],
	loaders = {
		'.json': source => 'module.exports=' + JSON.stringify(JSON.parse(source)),
		'.css': require(path.join(__dirname, '..', 'src', 'css.js')),
	},
	files = {
		home: os.homedir(),
	},
	eval_require = (func, base, cache = {}, base_require = mod.createRequire(base + '/')) => fn => {
		var resolved = base_require.resolve(fn);
		
		// internal module
		if(!fs.existsSync(resolved))return require(resolved);
		
		if(cache[resolved])return cache[resolved].exports;
		
		var mod = cache[resolved] = Object.setPrototypeOf({ _exports: {}, get exports(){ return this._exports }, set exports(v){ return this._exports = v }, filename: resolved, id: resolved, path: path.dirname(resolved), loaded: true, children: [] }, null),
			ext = path.extname(resolved),
			script = loaders[ext] ? loaders[ext](fs.readFileSync(resolved)) : fs.readFileSync(resolved) + '\n//@ sourceURL=' + resolved;
		
		try{
			new func('__dirname', '__filename', 'module', 'exports', 'require', script)(mod.path, resolved, mod, mod.exports, eval_require(func, mod.path + '/', cache));
		}catch(err){
			alert(resolved + ' - ' + util.format(err));
		}
		
		if(path.basename(resolved) == 'consts.js')mod.exports.injected_settings = [{
			name: 'Open resource folder',
			type: 'function',
			key: 'F6',
			value: () => child_process.exec('start ' + files.sploit),
		}];
		
		return mod.exports;
	},
	log = data => console.log((data instanceof Error ? '[' + data.name + '] ' : '') + util.format(data) + '\r\n');

nw.Window.open('https://krunker.io/', {
	position: 'center',
	width: ~~(screen.bounds.width * 0.8),
	height: ~~(screen.bounds.height * 0.7),
	title: 'Sploit',
	icon: 'icon.png',
}, win => {
	win.on('close', () => nw.App.quit());
	
	win.on('document-start', window => {
		if(window.parent != window || window.location.hostname != 'krunker.io' && !window.location.hostname.endsWith('.krunker.io') || window.location.pathname != '/')return;
		
		// add keybinds
		window.addEventListener('keydown', event => {
			switch(event.code){
				case'F5': // reload
					
					window.location.reload();
					
					break;
			}
		});
		
		/*inject_gm.GM_client_fetch = (url, headers) => new Promise(async (resolve, reject) => https.request({
			hostname: url.hostname,
			port: url.port,
			path: url.href.substr(url.origin.length),
			localAddress: await local_address,
			headers: headers,
		}, (res, chunks = []) => res.on('data', chunk => chunks.push(chunk)).on('end', () => resolve(Buffer.concat(chunks).toString()))).on('error', reject).end());
		
		var wrequire = eval_require(window.Function, path.join(__dirname, '..', 'src')),
			ui = wrequire('./ui');
		
		var local_address = ui.panel.options({
			title: 'Select a network interface',
			options: Object.entries(os.networkInterfaces()).map(([ label, value ]) => [ label + ' - ' + value.map(ip => ip.family + ': ' + ip.address).join(', '), value ]),
		}).then(inter => (inter.find(ip => ip.family == 'IPv4') || inter[0]).address);
		
		local_address.then(local_address => {
			window.WebSocket = class extends ws {
				constructor(url, proto){
					super(url, proto, {
						localAddress: local_address,
						headers: {
							'user-agent': navigator.userAgent,
							origin: window.location.origin,
						},
					});
				}
			};
		});*/
		
		// create node require in context
		eval_require(window.Function, path.join(__dirname, '..', 'src'))('.');
	});
});

chrome.webRequest.onBeforeRequest.addListener(details => {
	var url = new URL(details.url),	
		result = {},
		host = test => url.hostname.endsWith('.' + test) || url.hostname == test;
	
	return { cancel:
		host('paypal.com') && url.pathname == '/xoplatform/logger/api/logger' ||
		host('googlesyndication.com') ||
		host('googletagmanager.com') ||
		host('pub.network') ||
		host('adinplay.com') ||
		url.pathname.startsWith('/tagmanager/pptm.') ||
	false };
}, { urls: [ '<all_urls>' ] }, [ 'blocking' ]);