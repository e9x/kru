'use strict';

var fs = require('fs'),
	path = require('path'),
	Module = require('module'),
	contextify = process.binding('contextify'),
	custom_require = (func, base, loaders = {}, cache = {}, req) => req = Object.assign(fn => {
		var resolved = req.resolve(fn);
		
		if(!fs.existsSync(resolved))return require(resolved);
		
		if(req.cache[resolved])return req.cache[resolved].exports;
		
		var mod = req.cache[resolved] = Object.setPrototypeOf({ exports: Object.setPrototypeOf({}, null), filename: resolved, id: resolved, path: path.dirname(resolved), loaded: true, children: [] }, null),
			ext = path.extname(resolved),
			script = req.loaders[ext] ? req.loaders[ext](fs.readFileSync(resolved)) : fs.readFileSync(resolved) + '\n//@ sourceURL=' + resolved;
		
		contextify.compileFunction(
			script,
			mod.path,
			0,
			0,
			undefined,
			false,
			undefined,
			[],
			[
				'exports',
				'require',
				'module',
				'__filename',
				'__dirname',
			]
		).function.call(mod.exports, mod.exports, custom_require(func, mod.path, loaders, cache), mod, mod.path, resolved);
		
		return mod.exports;
	}, {
		resolve: fn => req.base.resolve(fn),
		base: Module.createRequire(base + '/'),
		cache: cache,
		loaders: loaders,
	});

custom_require(window.Function, path.join(__dirname, '..', 'sploit'), {
	'.json': require(path.join(__dirname, '..', 'sploit', 'libs', 'json.js')),
	'.css': require(path.join(__dirname, '..', 'sploit', 'libs', 'css.js')),
}, {})('.');