'use strict';
var os = require('os'),
	fs = require('fs'),
	mod = require('module'),
	util = require('util'),
	path = require('path'),
	child_process = require('child_process');

if(typeof nw == 'undefined'){ // not in nwjs
	var child_process = require('child_process');
	
	child_process.execFile(require('nw/lib/findpath')(), [
		__dirname,
		'--remote-debugging-port=9222',
		'--disable-frame-rate-limit',
		'--disable-gpu-vsync',
		'--max-gum-fps="9999"'
	], { stdio: 'inherit', stderr: 'inherit' }).on('close', () => {
		process.nextTick(() => process.exit(0));
	});
}else{
	window.addEventListener('error', event => alert(`Uncaught exception\nScript: ${event.filename}
Line: ${event.lineno}
Char: ${event.colno}
Error: ${event.error instanceof Error ? event.error.type : event.error}
Code: ${event.error instanceof Error ? event.error.code : ''}
Stack:
${(event.error instanceof Error ? event.error : new Error()).stack}`));
	
	var fs_promises_exists = path => new Promise((resolve, reject) => fs.promises.access(path, fs.F_OK).then(() => resolve(true)).catch(err => resolve(false))),
		screen = nw.Screen.screens[0],
		loaders = {
			'.json': source => 'module.exports=' + JSON.stringify(JSON.parse(source)),
			'.css': require(path.join(__dirname, '..', 'src', 'css.js')),
		},
		files = {
			home: os.homedir(),
		},
		inject_gm = {
			GM_getValue(key, value){
				var file = path.join(files.sploit, key + '.json');
				
				return fs.promises.readFile(file).catch(err => '');
			},
			GM_setValue(key, value){
				return fs.promises.writeFile(path.join(files.sploit, key + '.json'), value);
			},
			GM_xmlhttpRequest(details){
				// https://www.tampermonkey.net/documentation.php#GM_xmlhttpRequest
				
				details = Object.create(details);
				
				details.timeout = details.timeout || 0;
				
				var methods = [ 'GET', 'HEAD', 'POST' ],
					request = new XMLHttpRequest(),
					response = {},
					update_res = () => {
						response.status = request.status;
						response.statusText = request.statusText;
						response.readyState = request.readyState;
						response.responseText = request.responseText;
						response.responseHeaders = Object.fromEntries(request.getAllResponseHeaders().split('\r\n').map(line => [ line.split(':')[0], line.split(':').splice(1).join(':') ]));
						response.finalUrl = request.responseURL;
						
						return response;
					};
				
				if(typeof details.context == 'object')response.context = details.context;
				
				request.open(methods.includes(details.method) ? details.method : 'GET', details.url, details.synchronous == true ? false : true, details.username, details.password);
				
				if(typeof details.overrideMimeType == 'string')request.overrideMimeType(details.overrideMimeType);
				
				if(details.anonymous == true)request.withCredentials = false;
				if(typeof details.timeout == 'number')request.timeout = details.timeout;
				
				request.send(typeof details.data == 'string' ? details.data : undefined);
				
				request.addEventListener('abort', () => {
					update_res();
					if(typeof details.onabort == 'function')details.onabort(response);
				});
				
				request.addEventListener('error', () => {
					update_res();
					if(typeof details.onerror == 'function')details.onerror(response);
				});
				
				request.addEventListener('load', () => {
					update_res();
					if(typeof details.onload == 'function')details.onload(response);
				});
				
				request.addEventListener('progress', () => {
					update_res();
					if(typeof details.onprogress == 'function')details.onprogress(response);
				});
				
				request.addEventListener('readystatechange', () => {
					update_res();
					if(typeof details.onreadystatechange == 'function')details.onreadystatechange(response);
				});
				
				request.addEventListener('timeout', () => {
					update_res();
					if(typeof details.ontimeout == 'function')details.ontimeout(response);
				});
				
				return { abort: () => request.abort() };
			},
		},
		eval_require = (func, base, cache = {}, base_require = mod.createRequire(base + '/')) => fn => {
			var resolved = base_require.resolve(fn);
			
			// internal module
			if(!fs.existsSync(resolved))return require(resolved);
			
			if(cache[resolved])return cache[resolved].exports;
			
			var mod = cache[resolved] = Object.setPrototypeOf({ _exports: {}, get exports(){ return this._exports }, set exports(v){ return this._exports = v }, filename: resolved, id: resolved, path: path.dirname(resolved), loaded: true, children: [] }, null),
				ext = path.extname(resolved),
				script = loaders[ext] ? loaders[ext](fs.readFileSync(resolved)) : fs.readFileSync(resolved) + '\n//@ sourceURL=' + resolved;
			
			new func('__dirname', '__filename', 'module', 'exports', 'require', Object.keys(inject_gm), script)(mod.path, resolved, mod, mod.exports, eval_require(func, mod.path + '/', cache), ...Object.values(inject_gm));
			
			if(path.basename(resolved) == 'consts.js')mod.exports.injected_settings = [{
				name: 'Open resource folder',
				type: 'function_inline',
				key: 'F6',
				value: () => child_process.exec('start ' + files.sploit),
			},{
				name: 'Auto respawn',
				type: 'bool',
				walk: 'game.auto_respawn',
				key: 'unset',
			}];
			
			return mod.exports;
		};

	files.documents = path.join(files.home, 'Documents'),

	files.sploit = path.join(fs.existsSync(files.documents) ? files.documents : files.home, 'sploit');

	files.resources = path.join(files.sploit, 'resources');

	files.styles = path.join(files.sploit, 'styles');

	files.scripts = path.join(files.sploit, 'scripts');

	['sploit', 'resources', 'styles', 'scripts'].forEach(key => {
		if(!fs.existsSync(files[key]))try{
			fs.mkdirSync(files[key]);
		}catch(err){
			// cant access anyways
			delete files[key];
		}
	});

	nw.Window.open('https://krunker.io/', {
		position: 'center',
		width: ~~(screen.bounds.width * 0.6),
		height: ~~(screen.bounds.height * 0.5),
	}, win => {
		win.on('close', () => nw.App.quit());
		
		win.on('document-start', window => {
			if(window.parent != window || window.location.hostname != 'krunker.io' && !window.location.hostname.endsWith('.krunker.io') || window.location.pathname != '/')return;
			
			// add keybinds
			window.addEventListener('keydown', event => {
				switch(event.code){
					case'F5': // reload
						
						win.reload();
						
						break;
				}
			});
			
			// create node require in context
			eval_require(window.Function, __dirname)('../src');
		});
	});
}