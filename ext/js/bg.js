'use strict';
var sploit = {
		updates: 'https://e9x.github.io/kru/static/updates.json?ts=' + Date.now(),
		write_interval: 5000,
		update_interval: 5000,
		active: true,
		update_prompted: false,
	},
	check_for_updates = manifest => fetch(sploit.updates).then(res => res.json()).then(updates => {
		if(sploit.update_prompted)return;
		
		var current_ver = +(manifest.version.replace(/\D/g, '')),
			latest_ver = +(updates.extension.version.replace(/\D/g, ''));
		
		// updated or past latest release
		if(current_ver >= latest_ver)return;
		
		// outdated
		if(!confirm('Sploit is outdated (' + updates.extension.version + ' available), do you wish to update?'))return sploit.update_prompted = true;
		
		sploit.update_prompted = true;
		
		// add url to download queue
		chrome.downloads.download({
			url: updates.extension.install,
			filename: 'sploit-ext.zip',
		}, download => {
			// take user to chrome://extensions
			
			chrome.tabs.create({ url: 'chrome://extensions' });
			
			alert('successfully started download, drag the sploit-ext.zip file over chrome://extensions');
			
			// remove extension
			chrome.management.uninstallSelf();
		});
	}),
	_bundler = class {
		constructor(modules, padding = ['', '']){
			this.modules = modules;
			this.padding = padding;
		}
		wrap(str){
			return JSON.stringify([ str ]).slice(1, -1);
		}
		run(){
			return new Promise((resolve, reject) => Promise.all(this.modules.map(data => new Promise((resolve, reject) => fetch(data).then(res => res.text()).then(text => resolve(this.wrap(new URL(data).pathname) + '(module,exports,require,global){' + (data.endsWith('.json') ? 'module.exports=' + JSON.stringify(JSON.parse(text)) : text) + '}')).catch(err => reject('Cannot locate module ' + data))))).then(mods => resolve(this.padding[0] + 'var require=((l,i,h)=>(h="http:a",i=e=>(n,f,u)=>{f=l[new URL(n,e).pathname];if(!f)throw new TypeError("Cannot find module \'"+n+"\'");!f.e&&f.apply((f.e={}),[{userscript:userscript,browser:!0,get exports(){return f.e},set exports(v){return f.e=v}},f.e,i(h+f.name),window]);return f.e},i(h)))({' + mods.join(',') + '});' + this.padding[1])).catch(reject));
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
			
			switch(event){
				case'userscript':
					var obj = {
						name: 'Sploit',
						namespace: 'https://e9x.github.io/',
						supportURL: 'https://e9x.github.io/kru/inv/',
						version: manifest.version,
						extracted: new Date().toGMTString(),
						author: 'Gaming Gurus',
						license: 'BSD-3-Clause',
						match: 'https://krunker.io/*',
						grant: 'none',
						'run-at': 'document-start',
					};

					var whitespace = Object.keys(obj).sort((a, b) => b.length - a.length)[0].length + 8;
					
					var url = URL.createObjectURL(new Blob([ '// ==UserScript==\n' + Object.entries(obj).map(([ key, val ]) => ('// @' + key).padEnd(whitespace, ' ') + val).join('\n') + '\n// ==/UserScript==\n\n' + bundled + '(true,typeof require=="function"?require:null)' ], { type: 'application/javascript' }));
					
					chrome.downloads.download({
						url: url,
						filename: 'sploit.user.js',
					}, download => URL.revokeObjectURL(url));
					
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