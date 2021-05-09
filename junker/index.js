var os = require('os'),
	fs = require('fs'),
	path = require('path'),
	https = require('https'),
	msgpack = require('msgpack-lite'),
	webpack = require('webpack'),
	compiler_out = () => path.join(compiler.options.output.path, compiler.options.output.filename),
	run_cb = (err, stats) => {
		var error = !!(err || stats.compilation.errors.length);
		
		for(var ind = 0; ind < stats.compilation.errors.length; ind++)error = true, console.error(stats.compilation.errors[ind]);
		if(err)console.error(err);
		
		if(error)return console.error('One or more errors occured during building, refer to above console output for more info');
		
		console.log('Build success, output at', compiler_out());
	},
	compiler,
	minimize = !process.argv.includes('-fast');

compiler = webpack({
	entry: path.join(__dirname, 'src', 'index.js'),
	output: { path: path.join(__dirname, '..'), filename: 'junker.user.js' },
	module: { rules: [ { test: /\.css$/, use: [ { loader: path.join(__dirname, '..', 'src', 'css.js'), options: {} } ] } ] },
	optimization: { minimize: minimize },
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
					grant: 'none',
					connect: [ 'sys32.dev', 'githubusercontent.com' ],
				},
				meta = Object.entries(rmeta).flatMap(([ key, val ]) => Array.isArray(val) ? val.map(val => [ key, val ]) : [ [ key, val ] ]),
				whitespace = meta.map(meta => meta[0]).sort((a, b) => b.toString().length - a.toString().length)[0].length + 8,
				source = file.source.source().replace(/build_extracted/g, extracted.getTime());
			
			compilation.updateAsset(file.name, new webpack.sources.RawSource(`// ==UserScript==
${meta.map(([ key, val ]) => ('// @' + key).padEnd(whitespace, ' ') + val.toString()).join('\n')}
// ==/UserScript==
// For any concerns regarding minified code, you are encouraged to build from the source
// For license information please see https://raw.githubusercontent.com/e9x/kru/master/junker.user.js.LICENSE.txt

// Donations Accepted
// BTC:  3CsDVq96KgmyPjktUe1YgVSurJVe7LT53G
// ETH:  0x5dbF713F95F7777c84e6EFF5080e2f0e0724E8b1
// ETC:  0xF59BEbe25ECe2ac3373477B5067E07F2284C70f3
// Amazon Giftcard - skidlamer@mail.com

${source}`));
		})) },
	],
}, (err, stats) => {
	if(err)return console.error(err);
	
	if(process.argv.includes('-once'))compiler.run(run_cb);
	else compiler.watch({}, run_cb);
});