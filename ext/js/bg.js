'use strict';
var sploit = {
		manifest_url: 'https://e9x.github.io/kru/ext/manifest.json',
		tick: 2000,
		active: true,
		update_prompted: false,
		async zip(){
			var zip = new JSZip(),
				root = 'ext/',
				walk_dir = url => new Promise(resolve => fetch(url).then(res => res.json()).then(data => {
					if(!Array.isArray(data))return resolve(zip.file(data.path.substr(root.length), data.content, { base64: true }));
					
					Promise.all(data.map(data => walk_dir(data.url))).then(resolve);
				}));
			
			await walk_dir('https://api.github.com/repos/e9x/kru/contents/ext?ref=master&ts=' + Date.now());
			
			var blob = await zip.generateAsync({ type: 'blob' });
			
			await new Promise(resolve => chrome.downloads.download({
				url: URL.createObjectURL(blob),
				filename: 'sploit-ext.zip',
			}, resolve));
		},
		secret: Math.random(),
	},
	check_for_updates = manifest => fetch(sploit.manifest_url + '?ts=' + Date.now()).then(res => res.json()).then(new_manifest => {
		if(sploit.update_prompted)return;
		
		var current_ver = +(manifest.version.replace(/\D/g, '')),
			latest_ver = +(new_manifest.version.replace(/\D/g, ''));
		
		// latest or newer
		if(current_ver >= latest_ver)return;
		
		// outdated
		if(!confirm('Sploit is outdated (' + new_manifest.version + ' available), do you wish to update?'))return sploit.update_prompted = true;
		
		sploit.update_prompted = true;
		
		sploit.zip().then(() => {
			// take user to chrome://extensions then uninstall self
			
			chrome.tabs.create({ url: 'chrome://extensions' });
			
			alert('successfully started download, drag the sploit-ext.zip file over chrome://extensions');
			
			// remove extension
			chrome.management.uninstallSelf();
		});
	}),
	_bundler = class {
		constructor(modules, wrapper = [ '', '' ], padding = [ '', '' ], terser_opts){
			this.modules = modules;
			this.path = globalThis.fetch ? null : require('path');
			this.fs = globalThis.fetch ? null : require('fs');
			this.terser = globalThis.fetch ? null : require('terser');
			this.wrapper = wrapper;
			this.padding = padding;
			this.terser_opts = terser_opts;
		}
		wrap(str){
			return JSON.stringify([ str ]).slice(1, -1);
		}
		async resolve_contents(path){
			return await (globalThis.fetch ? fetch(path).then(res => res.text()) : this.fs.promises.readFile(path, 'utf8'));
		}
		relative_path(path){
			return this.path ? this.path.relative(__dirname, path) : path;
		}
		extension(path){
			return path.split('.').slice(-1)[0];
		}
		async run(){
			var mods = await Promise.all(this.modules.map(path => new Promise((resolve, reject) => this.resolve_contents(path).then(data => {
					var ext = this.extension(path);
					
					if(['txt', 'css', 'html'].includes(ext))data = 'module.exports=' + JSON.stringify(data);
					else if(ext == 'json')data = 'module.exports=' + JSON.stringify(JSON.parse(data));
					
					resolve(this.wrap(new URL(this.relative_path(path), 'http:a').pathname) + '(module,exports,require,global){' + data + '}')
				}).catch(err => reject('Cannot locate module ' + path + '\n' + err))))),
				out = this.wrapper[0] + 'var require=((m,g=this,c={},i=(p,v,k=[],x=(n,l=(n=new URL(n,h),n.pathname),o=c[l]={id:l,path:l,exports:{},filename:l,browser:!0,loaded:!0,children:[],loaded:!1,load:x,_compile:c=>new Function(c)()})=>(m[l].call(o,o,o.exports,i(n,v||o,k),g),o.loaded=!0,k.push(o),o),r=(b,n=new URL(b,p),f=m[n.pathname]||m[(n=new URL("index.js",n)).pathname],l=n.pathname)=>{if(!f)throw new TypeError("Cannot find module \'"+b+"\'");return(c[l]||x(n)).exports;})=>(r.cache=c,r.main=v,r),h="http:a")=>i(h))({' + mods + '});' + this.wrapper[1];
			
			if(this.terser_opts)out = await this.terser.minify(out, typeof this.terser_opts == 'object' ? this.terser_opts : {
				toplevel: true,
				compress: true,
			}).then(data => data.code);
			
			return this.padding[0] + out + this.padding[1];
		}
	},
	bundler = new _bundler([
		chrome.runtime.getURL('js/ui.js'),
		chrome.runtime.getURL('js/sploit.js'),
		chrome.runtime.getURL('js/events.js'),
		chrome.runtime.getURL('js/three.js'),
		chrome.runtime.getURL('js/input.js'),
		chrome.runtime.getURL('js/visual.js'),
		chrome.runtime.getURL('js/ui.js'),
		chrome.runtime.getURL('js/ui.css'),
		chrome.runtime.getURL('js/util.js'),
		chrome.runtime.getURL('js/msgpack.js'),
		chrome.runtime.getURL('manifest.json'),
	], [ '(()=>{', 'require("./js/sploit.js")})()//# sourceURL=sploit' ]),
	bundled,
	bundle = () => bundler.run().then(data => bundled = data);

fetch(chrome.runtime.getURL('manifest.json')).then(res => res.json()).then(manifest => {
	sploit.manifest = manifest;
	
	chrome.webNavigation.onCommitted.addListener(details => {
		var url = new URL(details.url);
		
		if(sploit.active && (url.hostname == 'krunker.io' || url.hostname.endsWith('.krunker.io')))chrome.tabs.executeScript(details.tabId, {
			// communication: sploit => content script => background script
			code: `
var port = chrome.extension.connect({ name: 'popup' });

port.onMessage.addListener(data => document.dispatchEvent(new CustomEvent(${JSON.stringify(sploit.secret)} + 'incoming', { detail: JSON.stringify(data) })));

document.addEventListener(${JSON.stringify(sploit.secret)} + 'outgoing', event => port.postMessage(JSON.parse(event.detail)));

var a=document.createElement('script');a.innerHTML=${bundler.wrap('document.currentScript.remove();var secret=' + JSON.stringify(sploit.secret) + ';' + bundled)};document.documentElement.appendChild(a);a=null`,
			runAt: 'document_start',
		});
	});
	
	check_for_updates(manifest);
	
	setInterval(() => check_for_updates(manifest), sploit.tick);
	
	bundle().then(() => chrome.extension.onConnect.addListener(_port => {
		var port = new events((...data) => _port.postMessage(data));
		
		_port.onMessage.addListener(data => port.emit(...data));
		
		port.send('meta', sploit);
		
		port.on('config_save', config => localStorage.setItem('config', JSON.stringify(config)));
		
		port.on('config_load', id => port.send(id, JSON.parse(localStorage.getItem('config') || '{}')));
		
		port.on('userscript', () => {
			var meta = [
				[ 'name', 'Sploit' ],
				[ 'namespace', 'https://e9x.github.io/' ],
				[ 'supportURL', 'https://e9x.github.io/kru/inv/' ],
				[ 'version', manifest.version ],
				[ 'extracted', new Date().toGMTString() ],
				[ 'author', 'Gaming Gurus' ],
				[ 'license', 'BSD-3-Clause' ],
				[ 'match', 'https://krunker.io/*' ],
				[ 'grant', 'GM_setValue' ],
				[ 'grant', 'GM_getValue' ],
				[ 'run-at', 'document-start' ],
			],
			whitespace = meta.map(meta => meta[0]).sort((a, b) => b.length - a.length)[0].length + 8;
			
			var url = URL.createObjectURL(new Blob([ '// ==UserScript==\n' + meta.map(([ key, val ]) => ('// @' + key).padEnd(whitespace, ' ') + val).join('\n') + '\n// ==/UserScript==\n\n' + bundled ], { type: 'application/javascript' }));
			
			chrome.downloads.download({ url: url, filename: 'sploit.user.js' }, download => URL.revokeObjectURL(url));
		});
		port.on('zip', () => sploit.zip());
		port.on('meta', (key, val) => sploit[key] = val);
	}));

	setInterval(bundle, sploit.tick);
});