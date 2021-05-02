var fs = require('fs'),
	path = require('path'),
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
	minimize = !process.argv.includes('-server');

compiler = webpack({
	entry: path.join(__dirname, 'src', 'index.js'),
	output: { path: __dirname, filename: 'sploit.user.js' },
	module: { rules: [ { test: /\.css$/, use: [ { loader: path.join(__dirname, 'src', 'css.js'), options: {} } ] } ] },
	optimization: {
		minimize: minimize,
	},
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
				whitespace = meta.map(meta => meta[0]).sort((a, b) => b.toString().length - a.toString().length)[0].length + 8,
				source = file.source.source().replace(/build_extracted/g, extracted.getTime());
			
			if(minimize)source = source.split('\n').slice(1).join('\n');
			
			compilation.updateAsset(file.name, new webpack.sources.RawSource(`// ==UserScript==
${meta.map(([ key, val ]) => ('// @' + key).padEnd(whitespace, ' ') + val.toString()).join('\n')}
// ==/UserScript==
// For any concerns regarding minified code, you are encouraged to build from the source
// For license information please see https://raw.githubusercontent.com/e9x/kru/master/sploit.user.js.LICENSE.txt\n\n${source}`));
		})) },
	],
}, (err, stats) => {
	if(err)return console.error(err);
	
	if(process.argv.includes('-once'))compiler.run(run_cb);
	else compiler.watch({}, run_cb);
});

if(process.argv.includes('-server')){
	var ws = require('ws'),
		https = require('https'),
		nodehttp = require('sys-nodehttp'),
		server = new nodehttp.Server({ port: 5050, log: true }),
		inject_js = () => {
			var rewrite_url = url => {
				url = new URL((url || '') + '', location);
				
				switch(url.host){
					case'assets.krunker.io':
						url.protocol = location.protocol;
						url.host = location.host;
						url.pathname = '/assets' + url.pathname;
						break;
					case'krunker.io':
						url.protocol = location.protocol;
						url.host = location.host;
						break;
					case'matchmaker.krunker.io':
						url.protocol = location.protocol;
						url.host = location.host;
						url.pathname = '/matchmaker' + url.pathname;
						break;
					case'social.krunker.io':
						url.protocol = location.protocol;
						url.host = location.host;
						url.pathname = '/social' + url.pathname;
						break;
					case'api.krunker.io':
						url.protocol = location.protocol;
						url.host = location.host;
						url.pathname = '/api' + url.pathname;
						break;
					case'user-assets.krunker.io':
						url.protocol = location.protocol;
						url.host = location.host;
						url.pathname = '/user-assets' + url.pathname;
						break;
				}
				
				return url.href;
			},
			unrewrite_url = url => {
				
			},
			set_blo = () => Object.getOwnPropertyDescriptor(URL.prototype, 'href').set.call(window.blocation, 'https://krunker.io' + location.search),
			orig = Object.getOwnPropertyDescriptor(Image.prototype, 'src');

			Object.defineProperty(Image.prototype, 'src', {
				get(){
					return orig.get.call(this);
				},
				set(value){
					return orig.set.call(this, rewrite_url(value));
				}
			});
			
			window.WebSocket = class extends WebSocket {
				constructor(url, proto){
					super(`ws${location.protocol == 'https' ? 's' : ''}://${location.host}/?url=${encodeURIComponent(url)}`);
				}
			}
			
			window.blocation = Object.assign(new URL('https://krunker.io' + location.search), {
				assign(url){
					location.assign(rewrite_url(url));
				},
				replace(url){
					location.replace(rewrite_url(url));
				},
			});
			
			Object.defineProperty(window.blocation, 'href', {
				get(){
					return Object.getOwnPropertyDescriptor(URL.prototype, 'href').get.call(this);
				},
				set(value){
					return location.href = rewrite_url(value);
				}
			});
			
			set_blo();
			
			var history_handler = (target, that, [ state, title, url ]) => {
				var ret = Reflect.apply(target, that, [ state, title, rewrite_url(url) ]);
				
				set_blo();
				
				return ret;
			}
			
			history.pushState = new Proxy(history.pushState, { apply: history_handler });
			history.replaceState = new Proxy(history.replaceState, { apply: history_handler });
			
			var func = (create, args) => {
				var script = args.splice(-1)[0];
				
				return create([...args, script.replace(/location/g, 'blocation')]);
			};
			
			window.Function = new Proxy(window.Function, {
				construct: (target, args) => func(args => Reflect.construct(target, args), args),
				apply: (target, that, args) => func(args => Reflect.apply(target, that, args), args),
			});
			
			window.fetch = new Proxy(window.fetch, { apply: (target, that, [ url, opts ]) => Reflect.apply(target, that, [ rewrite_url(url), opts ]) });

			XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, { apply: (target, that, [ method, url, ...args ]) => Reflect.apply(target, that, [ method, rewrite_url(url), ...args ]) });
		},
		proxy = (slice_prefix, prefix, host, after_proc) => server.use(prefix, async (req, res) => {
			var url = new URL('https://' + host + req.url.href.substr(req.url.origin.length + (slice_prefix ? prefix.length : 0)));
			
			https.request(url, { headers: { 'user-agent': 'code' } }, rex => {
				res.status(rex.statusCode);
				res.headers.set('content-type', rex.headers['content-type']);
				
				if(after_proc){
					var chunks = [];
				
					rex.on('data', chunk => chunks.push(chunk)).on('end', () => res.send(after_proc(req, res, Buffer.concat(chunks))));
				}else rex.pipe(res);
			}).end();
		});
	
	proxy(true, '/matchmaker', 'matchmaker.krunker.io');

	proxy(true, '/social', 'social.krunker.io');

	proxy(true, '/user-assets', 'user-assets.krunker.io');

	proxy(true, '/api', 'api.krunker.io');
	
	proxy(true, '/assets', 'assets.krunker.io');
	
	proxy(false, '/', 'krunker.io', (req, res, body) => req.url.pathname == '/' ? body.toString().replace(/https:\/\/assets\.krunker.io/g, '/assets').replace('<script>window._startTS = performance.now()</script>', match => `<script>(${inject_js})();${fs.readFileSync(compiler_out())}</script>`).replace('https://cookie-cdn.cookiepro.com/scripttemplates/otSDKStub.js', '') : body);
	
	server.ws('/', client => {
		var socket = new ws(client.url.searchParams.get('url'), { headers: { 'user-agent': 'code', origin: 'https://krunker.io' } }),
			ready = false,
			missed = [];
		
		socket.on('open', () => {
			ready = true;
			missed.forEach(data => socket.send(data));
			missed = [];
		});
		
		client.on('message', data => {
			if(!ready)missed.push(data);
			else socket.send(data);
		});
		
		socket.on('message', data => {
			client.send(data);
		});
		
		socket.on('close', () => client.close());
		
		client.on('close', () => socket.close());
	});
}