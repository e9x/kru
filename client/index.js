'use strict';
var os = require('os'),
	fs = require('fs'),
	vm = require('vm'),
	https = require('https'),
	mod = require('module'),
	util = require('util'),
	path = require('path'),
	child_process = require('child_process');


if(typeof nw == 'undefined')child_process.execFile(require('nw/lib/findpath')(), [
	__dirname,
	// '--remote-debugging-port=9222',
	// '--disable-frame-rate-limit',
], { stdio: 'inherit', stderr: 'inherit' }).on('close', () => {
	process.nextTick(() => process.exit(0));
}); else{
	window.addEventListener('error', event => alert(`Uncaught exception\nScript: ${event.filename}\nLine: ${event.lineno}\nChar: ${event.colno}\nError: \n${event.error instanceof Error ? event.error.type : event.error}\nCode: ${event.error instanceof Error ? event.error.code : ''}\nStack:\n${(event.error instanceof Error ? event.error : new Error()).stack}`));
	
	var screen = nw.Screen.screens[0],
		loaders = {
			'.json': require(path.join(__dirname, '..', 'sploit', 'libs', 'json.js')),
			'.css': require(path.join(__dirname, '..', 'sploit', 'libs', 'css.js')),
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
				new vm.Script(script, { filename : resolved });
				new func('__dirname', '__filename', 'module', 'exports', 'require', script)(mod.path, resolved, mod, mod.exports, eval_require(func, mod.path + '/', cache));
			}catch(err){
				return alert(util.format(err));
			}
			
			return mod.exports;
		};

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
			
			/*local_address = ui.options('Select a network interface', Object.entries(require('os').networkInterfaces()).map(([ label, value ]) => [ label + ' - ' + value.map(ip => ip.family + ': ' + ip.address).join(', '), value ])).then(inter => (inter.find(ip => ip.family == 'IPv4') || inter[0]).address);*/
			
			// create node require in context
			eval_require(window.Function, path.join(__dirname, '..', 'sploit'))('.');
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
}