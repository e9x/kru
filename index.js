var fs = require('fs'),
	path = require('path'),
	webpack = require('webpack'),
	run_cb = (err, stats) => {
		var error = !!(err || stats.compilation.errors.length);
		
		for(var ind = 0; ind < stats.compilation.errors.length; ind++)error = true, console.error(stats.compilation.errors[ind]);
		if(err)console.error(err);
		
		if(error)return console.error('One or more errors occured during building, refer to above console output for more info');
		
		console.log('Build success, output at', path.join(compiler.options.output.path, compiler.options.output.filename));
	},
	compiler = webpack({
		entry: path.join(__dirname, 'src', 'index.js'),
		output: { path: __dirname, filename: 'sploit.user.js' },
		module: { rules: [ { test: /\.css$/, use: [ { loader: path.join(__dirname, 'src', 'css.js'), options: {} } ] } ] },
		plugins: [
			{ apply: compiler => compiler.hooks.thisCompilation.tap('Replace', compilation => compilation.hooks.processAssets.tap({ name: 'Replace', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT }, () => {
				var file = compilation.getAsset(compiler.options.output.filename);
					spackage = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'))),
					extracted = new Date(),
					rmeta = {
						name: spackage.name,
						author: spackage.author,
						source: 'https://github.com/e9x/kru',
						version: spackage.version,
						license: spackage.license,
						namespace: spackage.homepage,
						supportURL: spackage.bugs.url,
						extracted: extracted.toGMTString(),
						include: /^https?:\/\/(internal\.|comp\.)?krunker\.io\/*?(index.html)?(\?|$)/,
						'run-at': 'document-start',
						grant: [ 'GM_setValue', 'GM_getValue', 'GM_xmlhttpRequest' ],
						connect: [ 'sys32.dev', 'githubusercontent.com' ],
					},
					meta = Object.entries(rmeta).flatMap(([ key, val ]) => Array.isArray(val) ? val.map(val => [ key, val ]) : [ [ key, val ] ]),
					whitespace = meta.map(meta => meta[0]).sort((a, b) => b.toString().length - a.toString().length)[0].length + 8;
				
				compilation.updateAsset(file.name, new webpack.sources.RawSource(`// ==UserScript==
${meta.map(([ key, val ]) => ('// @' + key).padEnd(whitespace, ' ') + val.toString()).join('\n')}
// ==/UserScript==
// For any concerns regarding minified code, you are encouraged to build from the source
// For license information please see https://raw.githubusercontent.com/e9x/kru/master/sploit.user.js.LICENSE.txt\n\n`
				+ file.source.source().split('\n').slice(1).join('\n').replace(/build_extracted/g, extracted.getTime())));
			})) },
		],
	}, (err, stats) => {
		if(err)return console.error(err);
		
		if(process.argv.includes('-once'))compiler.run(run_cb);
		else compiler.watch({}, run_cb);
	});