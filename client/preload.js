'use strict';

var run = 'junker';

var fs = require('fs'),
	path = require('path'),
	mod = require('module'),
	contextify = process.binding('contextify'),
	wrequire = (func, base, loaders = {}, cache = {}, req) => req = Object.assign(fn => {
		var resolved = req.resolve(fn);
		
		if(!fs.existsSync(resolved))return require(resolved);
		
		if(req.cache[resolved])return req.cache[resolved].exports;
		
		var mod = req.cache[resolved] = Object.setPrototypeOf({ exports: Object.setPrototypeOf({}, null), filename: resolved, id: resolved, path: path.dirname(resolved), loaded: true, children: [] }, Module.prototype),
			ext = path.extname(resolved),
			args = {
				module: mod,
				exports: mod.exports,
				require: wrequire(func, mod.path, loaders, cache),
				global: window,
				__dirname: mod.path,
				__filename: resolved,
			},
			script = req.loaders[ext] ? req.loaders[ext](fs.readFileSync(resolved)) : fs.readFileSync(resolved) + '\n//@ sourceURL=' + resolved;
		
		contextify.compileFunction(script, resolved, 0, 0, undefined, false, undefined, [], Object.keys(args)).function.apply(mod.exports, Object.values(args));
		
		return mod.exports;
	}, {
		resolve: fn => req.base.resolve(fn),
		base: mod.createRequire(base + '/'),
		cache: cache,
		loaders: loaders,
	});

class Module {}

setImmediate(wrequire(window.Function, path.join(__dirname, '..', run), {
	'.json': require(path.join(__dirname, '..', 'sploit', 'libs', 'json.js')),
	'.css': require(path.join(__dirname, '..', 'sploit', 'libs', 'css.js')),
}, {}).bind({}, '.'));