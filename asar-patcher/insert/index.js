'use strict';
// in MAIN process

var path = require('path'),
	main = require('./main.json'),
	fetch = require('node-fetch'),
	electron = require('electron'),
	renderer_inject = require('./renderer-inject'),
	log = console.log.bind(console, '[SPLOIT]'),
	hooks = {};

log('Injected main');

// process.on('uncaughtException', err => log(err));

var protocol = 'kpalstinks' + (Math.random() + '').substr(2);

electron.protocol.registerSchemesAsPrivileged([ { scheme: protocol, privileges: { bypassCSP: true } } ]);

electron.app.on('ready', () => {
	electron.protocol.registerBufferProtocol(protocol, (request, callback) => {
		var url = new URL('https' + request.url.substr(protocol.length));
		
		log('Fetching', url);
		
		fetch(url, {
			headers: request.headers,
			method: request.method,
			body: request.body,
		}).then(res => res.buffer().then(data => {
			log('Calling callback..');
			
			callback({
				mimeType: res.headers.get('content-type'),
				data: Buffer.concat([ data, Buffer.from(`;(${renderer_inject})()`) ]),
			});
		})).catch(err => {
			log('Error on request', err);
			
			callback({
				mimeType: res.headers.get('content-type'),
				data: Buffer.alloc(0),
			});
		});
	});
	
	electron.session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
		var url = new URL(details.url);
		
		if(url.protocol == 'https:' && (url.host == 'krunker.io' || url.host.endsWith('.krunker.io')) && url.pathname == '/libs/zip.js')return callback({ cancel: false, redirectURL: `${protocol}:${url.href.substr(url.protocol.length)}` });
		
		callback(details);
	});
});

/*
Object.defineProperty(require.cache[require.resolve('electron')], 'exports', { value: hooks });

var descs = Object.getOwnPropertyDescriptors(electron);

for(var prop in descs)Object.defineProperty(hooks, prop, prop == 'BrowserWindow' ? { value: new Proxy(electron.BrowserWindow, {
	construct(target, args){
		var window = Reflect.construct(target, args);
		
		window.toggleDevTools();
		
		return window;
	}
}) } : descs[prop]);
*/

// load main file
require(path.resolve(__dirname, '..', main));