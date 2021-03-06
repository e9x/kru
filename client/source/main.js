var fs = require('fs'),
	os = require('os'),
	path = require('path'),
	util = require('util'),
	https = require('https'),
	screen = nw.Screen.screens[0],
	center = size => (size.x = ~~(screen.bounds.width / 2 - size.width / 2), size.y = ~~(screen.bounds.height / 2 - size.height / 2), size),
	get_user = () => new Promise((resolve, reject) => https.request({ host: 'greasyfork.org', path: '/scripts/421228-sploit/code/Sploit.user.js' }, (res, chunks = []) => res.on('data', chunk => chunks.push(chunk)).on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))).on('error', reject).end()),
	_require = (context, base) => {
		var req = fn => {
			var resolved = path.resolve(req.base, fn);
			
			if(!fs.existsSync(resolved))throw new TypeError('Cannot find module ' + JSON.stringify(fn) + ' ( ' + resolved + ' )');
			
			if(req.cache[resolved])return req.cache[resolved].exports;
			
			var mod = req.cache[resolved] = Object.setPrototypeOf({ _exports: {}, get exports(){ return this._exports }, set exports(v){ return this._exports = v }, context: context, filename: resolved, id: resolved, path: path.dirname(resolved), loaded: true, children: [] }, null),
				script = (path.extname(resolved) == '.json' ? 'module.exports=' : '') + fs.readFileSync(resolved, 'utf8') + '\n//@ sourceURL=' + resolved;
			
			new context.Function('module', 'exports', 'require', script)(mod, mod.exports, _require(context, mod.path));
			
			return mod.exports;
		};
		
		req.cache = [];
		req.base = base;
		
		return req;
	};

nw.Window.open('https://krunker.io/', center({
	width: ~~(screen.bounds.width * 0.8),
	height: ~~(screen.bounds.height * 0.7),
}), game => {
	game.on('close', () => nw.App.quit());
	
	global.game = game;
	
	game.on('document-start', window => {
		if(window.location.host.endsWith('krunker.io') && window.location.pathname == '/'){
			// window.fetch = (url, opts) => new Promise((resolve, reject) => { throw new TypeError('Failed to fetch') });
			
			// get_user().then(userscript => new window.Function('require', userscript)(require)).catch(err => (window.alert('FATAL:\n' + util.format(err)), window.close()));
			
			var frame = Object.assign(window.document.documentElement.appendChild(window.document.createElement('iframe')), {style: 'display:none' });
			
			new frame.contentWindow.Function('require', 'require("../../../ext/js/sploit.js")')(_require(frame.contentWindow, require.resolve('.')));
		}
	});
});

// npm install nw@sdk