'use strict';
var os = require('os'),
	fs = require('fs'),
	path = require('path'),
	https = require('https'),
	webpack = require('webpack'),
	hosts = [ 'krunker.io', '*.browserfps.com', 'linkvertise.com' ],
	create_script = (script, compiler = webpack({
		entry: script.entry,
		output: {
			path: path.dirname(script.output),
			filename: path.basename(script.output),
		},
		context: path.dirname(script.entry),
		module: { rules: [
			{ test: /\.css$/, use: [ { loader: path.join(__dirname, 'webpack', 'css.js') } ] },
			{ test: /\.json$/, use: [ { loader: path.join(__dirname, 'webpack', 'json.js') } ], type: 'javascript/auto' },
		] },
		mode: 'development', // minimize ? 'production' : 'development',
		devtool: false,
		plugins: [
			{ apply: compiler => compiler.hooks.thisCompilation.tap('Replace', compilation => compilation.hooks.processAssets.tap({ name: 'Replace', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT }, () => {
				var file = compilation.getAsset(compiler.options.output.filename),
					spackage = script.package(),
					extracted = new Date(),
					rmeta = Object.assign({
						name: spackage.name,
						author: spackage.author,
						source: script.source,
						description: spackage.description,
						version: spackage.version,
						license: spackage.license,
						namespace: spackage.homepage,
						supportURL: spackage.bugs.url,
						extracted: extracted.toGMTString(),
						match: hosts.map(host => '*://' + host + '/*'),
						'run-at': 'document-start',
						connect: [ 'sys32.dev', 'githubusercontent.com' ],
					}, script.meta),
					meta = Object.entries(rmeta).flatMap(([ key, val ]) => [ val ].flat(Infinity).map(val => [ key, val ])),
					whitespace = meta.map(meta => meta[0]).sort((a, b) => b.toString().length - a.toString().length)[0].length + 8,
					source = file.source.source().replace(/build_extracted/g, extracted.getTime());
				
				// if(minimize && source.split('\n')[0].startsWith('/*'))source = source.split('\n').slice(1).join('\n');
				
				compilation.updateAsset(file.name, new webpack.sources.RawSource(`// ==UserScript==
${meta.map(([ key, val ]) => ('// @' + key).padEnd(val ? whitespace : 0, ' ') + val.toString()).join('\n')}
// ==/UserScript==
${[''].concat((script.after ? script.after.concat('') : [])).join('\n')}
${source}`));
			})) },
		],
	}, (err, stats) => {
		if(err)return console.error(err);
		
		compiler[process.argv.includes('-once') ? 'run' : 'watch']({}, (err, stats) => {
			var error = !!(err || stats.compilation.errors.length);
			
			for(var ind = 0; ind < stats.compilation.errors.length; ind++)error = true, console.error(stats.compilation.errors[ind]);
			if(err)console.error(err);
			
			if(error)return console.error('Build of', script.output, 'fail');
			else console.log('Build of', script.output, 'success');
		});
	})) => null;

create_script({
	package(){
		return {
			name: 'Krunker Junker',
			author: 'SkidLamer',
			version: '1.0',
			description: 'Junk in Your Krunk Guaranteed',
			bugs: { url: 'https://e9x.github.io/kru/inv/' },
			homepage: 'https://skidlamer.github.io/',
			license: 'gpl-3.0',
		};
	},
	meta: {
		icon: 'https://i.imgur.com/pA5e8hy.png',
		grant: 'none',
		namespace: 'https://greasyfork.org/users/704479',
		noframes: 'temp',
	},
	after: [
		`// Donations Accepted`,
		`// BTC:  3CsDVq96KgmyPjktUe1YgVSurJVe7LT53G`,
		`// ETH:  0x5dbF713F95F7777c84e6EFF5080e2f0e0724E8b1`,
		`// ETC:  0xF59BEbe25ECe2ac3373477B5067E07F2284C70f3`,
		`// Amazon Giftcard - skidlamer@mail.com`,
	],
	// window is another context when grants are given, never noticed this in sploit
	entry: path.join(__dirname, 'junker', 'index.js'),
	output: path.join(__dirname, 'junker.user.js'),
	source: 'https://github.com/e9x/kru/tree/master/junker',
});

create_script({
	package(){
		return JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json')));
	},
	meta: {
		icon: 'https://e9x.github.io/kru/sploit/libs/gg.gif',
		grant: [ 'GM_setValue', 'GM_getValue', 'GM_xmlhttpRequest' ],
		noframes: 'temp',
	},
	entry: path.join(__dirname, 'sploit', 'index.js'),
	output: path.join(__dirname, 'sploit.user.js'),
	source: 'https://github.com/e9x/kru',
});