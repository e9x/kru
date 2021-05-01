window.addEventListener('error', event => alert(`Uncaught exception\nScript: ${event.filename}
Line: ${event.lineno}
Char: ${event.colno}
Error: ${event.error instanceof Error ? event.error.type : event.error}
Code: ${event.error instanceof Error ? event.error.code : ''}
Stack:
${(event.error instanceof Error ? event.error : new Error()).stack}`));

var os = require('os'),
	fs = require('fs'),
	mod = require('module'),
	util = require('util'),
	path = require('path'),
	child_process = require('child_process'),
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
			
			return new Promise(resolve => fs.promises.readFile(file).then(resolve).catch(err => ''));
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
			
			request.addEventListener('error', () => (update_res(), typeof details.onerror == 'function' && details.onerror(response)));
			
			request.addEventListener('load', () => (update_res(), typeof details.onload == 'function' && details.onload(response)));
			
			request.addEventListener('timeout', () => (update_res(), typeof details.ontimeout == 'function' && details.ontimeout(response)));
			
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
	},
	log = data => fs.promises.appendFile(files.log, (data instanceof Error ? '[' + data.name + '] ' : '') + util.format(data) + '\r\n');

files.documents = path.join(files.home, 'Documents'),

files.sploit = path.join(fs.existsSync(files.documents) ? files.documents : files.home, 'sploit');

files.resources = path.join(files.sploit, 'resources');

files.styles = path.join(files.sploit, 'styles');

files.scripts = path.join(files.sploit, 'scripts');

files.log = path.join(files.sploit, 'sploit.log');

['sploit', 'resources', 'styles', 'scripts'].forEach(key => {
	try{
		if(!fs.existsSync(files[key]))fs.mkdirSync(files[key]);
	}catch(err){
		log(new Error('Could not access ' + key));
	}
});

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
		
		var style = window.document.createElement('style'),
			interval = setInterval(() => window.document.head && (clearInterval(interval), window.document.head.appendChild(style)));
		
		fs.promises.readdir(files.styles).then(async read => {
			var blobs = await Promise.all(read.map(file => fs.promises.readFile(path.join(files.styles, file)).then(data => window.URL.createObjectURL(new Blob([ data ]))))).catch(err => (log(err), false));
			
			style.textContent = blobs.map(blob => '@import url(' + JSON.stringify(blob) + ');');
			
			style.addEventListener('load', () => blobs.forEach(blob => window.URL.revokeObjectURL(blob)));
		}).catch(log);
		
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