'use strict';
var fs = require('fs'),
	path = require('path'),
	electron = require('electron');

if(!electron.app.requestSingleInstanceLock())electron.app.quit();

electron.app.on('ready', () => {
	var screen = electron.screen.getPrimaryDisplay().workAreaSize,
		window = new electron.BrowserWindow({
			width: 725,
			height: 500,
			show: false,
			webPreferences: {
				nodeIntegration: true,
				contextIsolation: false,
			},
			frame: false,
		});
	
	electron.ipcMain.handle('dialog', (event, prop) => electron.dialog.showOpenDialog(window, {
		properties: [ prop ],
	}));
	
	electron.ipcMain.handle('user-data', () => electron.app.getPath('userData'));
	
	window.removeMenu();
	window.loadFile(path.join(__dirname, 'index.html'));
	
	window.webContents.on('ready-to-show', () => window.show());
});