'use strict';
var vm = require('vm'),
	mod = require('module'),
	path = require('path'),
	electron = require('electron'),
	useragent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36 Edg/86.0.622.69',
	keybinds = [{ 
		key: 'Escape',
		press(){
			this.webContents.executeJavaScript(`document.exitPointerLock()`);
		},
	},{
		// new match
		key: 'F4',
		press(){
			this.loadURL('https://krunker.io');
		},
	},{
		key: 'F5',
		press(){
			this.reload();
		},
	},{
		key: 'F11',
		press(){
			this.setFullScreen(!this.isFullScreen());
		}
	}, {
		key: 'F12',
		press(){
			if(this.webContents.isDevToolsOpened())this.webContents.closeDevTools();
			else this.webContents.openDevTools({ mode: 'undocked' });
		}
	}];

// electron.app.commandLine.appendSwitch('disable-frame-rate-limit');

electron.app.on('ready', () => {
	var screen = electron.screen.getPrimaryDisplay().workAreaSize,
		window = new electron.BrowserWindow({
			width: ~~(screen.width * 0.7),
			height: ~~(screen.height * 0.7),
			show: false,
			webPreferences: {
				contextIsolation: false,
				preload: path.join(__dirname, 'preload.js'),
			},
			thickFrame: true,
		});
		
	electron.globalShortcut.unregister('Escape');
	
	window.webContents.on('page-title-updated', () => {
		window.setTitle('Sploit');
	});
	
	window.webContents.on('before-input-event', (sender, event) => {
		for(var keybind of keybinds)if(event.type == 'keyDown' && keybind.key == event.code)keybind.press.call(window, event);
	});
	
	window.loadURL('https://krunker.io', {
		userAgent: useragent,
	});
	
	window.removeMenu();
	
	window.webContents.once('ready-to-show', () => {
		window.show();
	});
	
	electron.session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
		details.requestHeaders['user-agent'] = useragent;
		callback({ cancel: false, requestHeaders: details.requestHeaders });
	});
	
	electron.session.defaultSession.webRequest.onBeforeRequest({ urls: [ '*://*/*' ] }, (details, callback) => {
		var url = new URL(details.url),
			host = test => url.hostname.endsWith('.' + test) || url.hostname == test;
		
		callback({ cancel:
			host('paypal.com') && url.pathname == '/xoplatform/logger/api/logger' ||
			host('googlesyndication.com') ||
			host('googletagmanager.com') ||
			host('pub.network') ||
			host('adinplay.com') ||
			url.pathname.startsWith('/tagmanager/pptm.') ||
		false });
	});
});