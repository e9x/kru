'use strict';
var sploit = {
		manifest: 'https://e9x.github.io/kru/ext/manifest.json',
		zip: 'https://e9x.github.io/kru/ext.zip',
		write_interval: 5000,
		update_interval: 5000,
		active: true,
		update_prompted: false,
		async us(){
			var obj = {
				name: 'Sploit',
				namespace: 'https://e9x.github.io/',
				supportURL: 'https://e9x.github.io/kru/inv/',
				version: await fetch(chrome.runtime.getURL('manifest.json')).then(res => res.json()).then(json => json.version),
				extracted: new Date().toGMTString(),
				author: 'Gaming Gurus',
				license: 'BSD-3-Clause',
				match: 'https://krunker.io/*',
				grant: 'none',
				'run-at': 'document-start',
			},
			whitespace = Object.keys(obj).sort((a, b) => b.length - a.length)[0].length + 8;
			
			var url = URL.createObjectURL(new Blob([ '// ==UserScript==\n' + Object.entries(obj).map(([ key, val ]) => ('// @' + key).padEnd(whitespace, ' ') + val).join('\n') + '\n// ==/UserScript==\n\n' + bundled + '(true,typeof require=="function"?require:null)' ], { type: 'application/javascript' }));
			
			await new Promise(resolve => chrome.downloads.download({
				url: url,
				filename: 'sploit.user.js',
			}, download => URL.revokeObjectURL(url) + resolve()));
		},
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
	},
	check_for_updates = manifest => fetch(sploit.manifest + '?ts=' + Date.now()).then(res => res.json()).then(new_manifest => {
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
		async run(){
			var mods = await Promise.all(this.modules.map(data => new Promise((resolve, reject) => this.resolve_contents(data).then(text => resolve(this.wrap(new URL(this.relative_path(data), 'http:a').pathname) + '(module,exports,require,global){' + (data.endsWith('.json') ? 'module.exports=' + JSON.stringify(JSON.parse(text)) : text) + '}')).catch(err => reject('Cannot locate module ' + data + '\n' + err))))),
				out = `${this.wrapper[0]}var require=((m,g=this,c={},i=(p,v,k=[],x=(n,l=(n=new URL(n,h),n.pathname),o=c[l]={id:l,path:l,exports:{},filename:l,browser:!0,loaded:!0,children:[],loaded:!1,load:x,_compile:c=>new Function(c)()})=>(m[l].call(o,o,o.exports,i(n,v||o,k),g),o.loaded=!0,k.push(o),o),r=(b,n=new URL(b,p),f=m[n.pathname]||m[(n=new URL('index.js',n)).pathname],l=n.pathname)=>{if(!f)throw new TypeError('Cannot find module '+JSON.stringify(b));return(c[l]||x(n)).exports;})=>(r.cache=c,r.main=v,r),h='http:a')=>i(h))({${mods}});${this.wrapper[1]}`;
			
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
		chrome.runtime.getURL('js/three.js'),
		chrome.runtime.getURL('js/input.js'),
		chrome.runtime.getURL('js/visual.js'),
		chrome.runtime.getURL('js/ui.js'),
		chrome.runtime.getURL('js/util.js'),
		chrome.runtime.getURL('manifest.json'),
	], [ '', 'require("./js/sploit.js")' ]),
	bundled,
	bundle = () => bundler.run().then(data => bundled = 'new(Object.assign(document.documentElement.appendChild(document.createElement("iframe")),{style:"display:none"}).contentWindow.Function)("userscript","nrequire","("+(_=>{' + data + '})+")()")');

// .replace(/(?<![a-zA-Z0-9])var /g, 'let ')

fetch(chrome.runtime.getURL('manifest.json')).then(res => res.json()).then(manifest => {
	// 1. prevent krunker wasm from being loaded
	chrome.webRequest.onBeforeRequest.addListener(details => ({ cancel: sploit.active && details.url.includes('.wasm') }), { urls: manifest.permissions.filter(perm => perm.startsWith('http')) }, [ 'blocking' ]);
	
	// 2. inject sploit code
	chrome.webNavigation.onCompleted.addListener((details, url = new URL(details.url)) => sploit.active && url.host.endsWith('krunker.io') && url.pathname == '/' && chrome.tabs.executeScript(details.tabId, {
		code: 'document.documentElement.setAttribute("onreset",' + bundler.wrap(bundled + '(false)') + '),document.documentElement.dispatchEvent(new Event("reset")),setTimeout(_=>document.documentElement.removeAttribute("onreset"),75)',
		runAt: 'document_start',
	}));
	
	// 3. check for updates
	check_for_updates(manifest);
	
	setInterval(() => check_for_updates(manifest), sploit.update_interval);
	
	// 4. bundle then listen on interface port
	bundle().then(() => chrome.extension.onConnect.addListener(port => {
		port.postMessage([ 'sploit', sploit ]);
		
		port.onMessage.addListener(data => {
			var event = data.splice(0, 1)[0];
			
			console.log(event);
			
			switch(event){
				case'zip':
					
					sploit.zip();
					
					break;
				case'userscript':
					
					sploit.us();
					
					break;
				case'sploit':
					
					// writing config
					sploit[data[0]] = data[1];
					
					break;
			}
		});
	}));

	setInterval(bundle, sploit.write_interval);
});