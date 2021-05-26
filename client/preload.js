'use strict';

var fs = require('fs'),
	path = require('path'),
	mod = require('module'),
	eval_require = (func, base, req) => req = Object.assign(fn => {
		var resolved = req.resolve(fn);
		
		// internal module
		if(!fs.existsSync(resolved))return require(resolved);
		
		if(req.cache[resolved])return req.cache[resolved].exports;
		
		var mod = req.cache[resolved] = Object.setPrototypeOf({ _exports: {}, get exports(){ return this._exports }, set exports(v){ return this._exports = v }, filename: resolved, id: resolved, path: path.dirname(resolved), loaded: true, children: [] }, null),
			ext = path.extname(resolved),
			script = req.loaders[ext] ? req.loaders[ext](fs.readFileSync(resolved)) : fs.readFileSync(resolved) + '\n//@ sourceURL=' + resolved;
		
		new func('__dirname', '__filename', 'module', 'exports', 'require', script)(mod.path, resolved, mod, mod.exports, Object.assign(eval_require(func, mod.path + '/'), { cache: req.cache }));
		
		return mod.exports;
	}, {
		resolve: fn => req.base.resolve(fn),
		base: mod.createRequire(base + '/'),
		cache: {},
		loaders: {
			'.json': require(path.join(__dirname, '..', 'sploit', 'libs', 'json.js')),
			'.css': require(path.join(__dirname, '..', 'sploit', 'libs', 'css.js')),
		},
	});

setTimeout(() => eval_require(window.Function, path.join(__dirname, '..', 'sploit'))('.'), 10);