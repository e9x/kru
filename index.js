var fs = require('fs'),
	path = require('path'),
	webpack = require('webpack'),
	compiler = webpack({
		entry: path.join(__dirname, 'src', 'sploit.js'),
		output: { path: __dirname, filename: 'sploit.user.js' },
		devtool: 'source-map',
		module: { rules: [ { test: /\.css$/, use: [ { loader: path.join(__dirname, 'raw.js'), options: {} } ] } ] },
		plugins: [ { apply: compiler => compiler.hooks.thisCompilation.tap('Replace', compilation => compilation.hooks.processAssets.tap({ name: 'Replace', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT }, () => {
			var file = compilation.getAsset('sploit.user.js');
				spackage = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'))),
				meta = [
					[ 'name', spackage.name ],
					[ 'namespace', spackage.homepage ],
					[ 'supportURL', spackage.bugs.url ],
					[ 'version', spackage.version ],
					[ 'extracted', new Date().toGMTString() ],
					[ 'author', spackage.author ],
					[ 'license', spackage.license ],
					[ 'match', 'https://krunker.io' ],
					[ 'match', 'https://comp.krunker.io' ],
					[ 'match', 'https://internal.krunker.io' ], // 🤡
					[ 'grant', 'GM_setValue' ],
					[ 'grant', 'GM_getValue' ],
					[ 'run-at', 'document-start' ],
					[ 'source', 'https://github.com/e9x/kru/tree/master/src' ],
				],
				whitespace = meta.map(meta => meta[0]).sort((a, b) => b.toString().length - a.toString().length)[0].length + 8;
			
			compilation.updateAsset(file.name, new webpack.sources.RawSource(`// ==UserScript==
${meta.map(([ key, val ]) => ('// @' + key).padEnd(whitespace, ' ') + val.toString()).join('\n')}
// ==/UserScript==
// For any concerns regarding minified code, you are encouraged to build from the source
// For license information please see https://raw.githubusercontent.com/e9x/kru/master/sploit.user.js.LICENSE.txt

` + file.source.source().split('\n').slice(1, -1).concat('//# sourceMappingURL=https://raw.githubusercontent.com/e9x/kru/master/sploit.user.js.map').join('\n')));
		})) } ],
	}, (err, stats) => {
		if(err)return console.error(err);
		
		compiler.watch({}, (err, stats) => {
			var error = !!(err || stats.compilation.errors.length);
			
			for(var ind = 0; ind < stats.compilation.errors.length; ind++)error = true, console.error(stats.compilation.errors[ind]);
			if(err)console.error(err);
			
			if(error)return console.error('One or more errors occured during building, refer to above console output for more info');
			
			console.log('Build success');
		});
	});