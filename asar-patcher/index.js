'use strict';
var fs = require('fs'),
	path = require('path'),
	webpack = require('webpack'),
	Asar = require('./asar'),
	electron = require('electron'),
	patcher = {
		key: 'kpalstinks',
		resolve(client){
			return this.clients[client];
		},
		async check(client){
			var asar = new Asar();
			
			await asar.open(this.resolve(client));
			
			return asar.exists(this.key);
		},
		async unpatch(client){
			
		},
		async patch(client){
			var asar = new Asar();
			
			await asar.open(this.resolve(client));
			
			var electron_package = JSON.parse(await asar.readFile('package.json'));
			
			var main = (await asar.readFile(electron_package.main)).toString();
			
			await asar.insertFolder(path.join(__dirname, 'insert'), this.key);
			
			var new_entry = this.key + '/index.js',
				relative = path.posix.relative(asar.resolve(new_entry, true), asar.resolve(electron_package.main, true));
			
			await asar.writeFile(this.key + '/main.json', JSON.stringify(electron_package.main, true));
			
			electron_package.main = new_entry;
			
			await asar.writeFile('package.json', JSON.stringify(electron_package));
			
			await asar.save();
		},
		clients: {
			KPal: {
				path: 'kpal_client',
				icon: '',
			},
		},
	};

electron.app.on('ready', () => {
	electron.contextBridge.exposeInMainWorld('patch', {
		get_clients(){
			return clients;
		},
	});
	
	var screen = electron.screen.getPrimaryDisplay().workAreaSize,
		window = new electron.BrowserWindow({ width: 500, height: 500, show: false });
	
	window.removeMenu();
	window.loadFile(path.join(__dirname, 'index.html'));
	
	window.webContents.on('ready-to-show', () => {
		window.show();
	});
});

//patch_asar(path.join(__dirname, 'input.asar'), path.join(__dirname, 'app.asar'));