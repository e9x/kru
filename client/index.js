'use strict';
var vm = require('vm'),
	mod = require('module'),
	path = require('path'),
	electron = require('electron'),
	useragent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36 Edg/86.0.622.69',
	useragent_opt = { userAgent: useragent },
	test_host = (url, ...tests) => tests.some(test => url.host.endsWith('.' + test) || url.host == test),
	parse_size = (side, config) => {
		var size = config[side];
		
		if(typeof size != 'string')return size;
		
		var parent = config.parent ? config.parent.getSize() : electron.screen.getPrimaryDisplay().workAreaSize,
			amount = (size.match(/[\d.]+/) || 0)[0] || '',
			unit = size.substr(amount.length);
		
		if(config.parent)parent = { width: parent[0], height: parent[1] };
		
		amount += 0;
		
		switch(unit){
			case'%':
				
				return ~~(parent[side] * (amount / 1000));
				
				break;
			default:
				
				console.log('No unit for ' + unit);
				
				return amount;
				
				break;
		}
	},
	init_window = config => {
		var window = new electron.BrowserWindow(Object.assign(config, {
			width: parse_size('width', config),
			height: parse_size('height', config),
			show: false,
			darkTheme: true,
		}));
		
		window.webContents.on('new-window', navigate);
		window.webContents.on('will-navigate', navigate);
		
		window.webContents.once('ready-to-show', () => {
			window.show();
		});
		
		window.removeMenu();
		
		return window;
	},
	keybinds = [{ 
		key: 'Escape',
		press(){
			this.webContents.executeJavaScript(`document.exitPointerLock()`);
		},
	},{
		// new match
		key: 'F4',
		press(){
			this.loadURL('https://krunker.io', useragent_opt);
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
	}],
	windows = {
		init_game(){
			return this.game || (this.game = init_window({
				width: '70%',
				height: '70%',
				title: 'Sploit',
				webPreferences: {
					contextIsolation: false,
					preload: path.join(__dirname, 'preload.js'),
				},
			}));
		},
		init_editor(){
			return this.editor || (this.editor = init_window({
				width: '80%',
				height: '80%',
				parent: this.init_game(),
			}));
		},
		init_social(){
			return this.social || (this.social = init_window({
				width: '80%',
				height: '80%',
				parent: this.init_game(),
			}));
		},
	},
	navigate = (event, url) => {
		event.preventDefault();
		
		url = new URL(url);
		
		if(test_host(url, 'krunker.io', 'internal.krunker.io', '127.0.0.1:8080'))switch(url.pathname){
			case'/editor.html':
				
				windows.init_editor().loadURL(url.href, useragent_opt);
				
				break;
			case'/social.html':
				
				windows.init_social().loadURL(url.href, useragent_opt);
				
				break;
			case'/viewer.html':	
				
				windows.init_viewer().loadURL(url.href, useragent_opt);
				
				break;
			case'/':
			case'/index.html':
				
				windows.init_game().loadURL(url.href, useragent_opt);
				
				break;
			default:
				
				electron.shell.openExternal(url.href);
				
				break;
		}else electron.shell.openExternal(url.href);
	};

// COMMAND LINE SWITCHES

// electron.app.commandLine.appendSwitch('disable-frame-rate-limit');

electron.app.on('ready', () => {
	// ADBLOCK
	
	electron.session.defaultSession.webRequest.onBeforeRequest({ urls: [ '*://*/*' ] }, (details, callback) => {
		var url = new URL(details.url);
		
		callback({ cancel:
			test_host(url, 'paypal.com') && url.pathname == '/xoplatform/logger/api/logger' ||
			test_host(url, 'googlesyndication.com', 'googletagmanager.com', 'pub.network', 'adinplay.com') ||
			url.pathname.startsWith('/tagmanager/pptm.') ||
		false });
	});
	
	// USERAGENT
	
	electron.session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
		details.requestHeaders['User-Agent'] = useragent;
		callback({ cancel: false, requestHeaders: details.requestHeaders });
	});
	
	var window = windows.init_game();
	
	window.webContents.on('page-title-updated', () => {
		window.setTitle('Sploit');
	});
	
	window.webContents.on('before-input-event', (sender, event) => {
		for(var keybind of keybinds)if(event.type == 'keyDown' && keybind.key == event.code)keybind.press.call(window, event);
	});
	
	window.loadURL('https://krunker.io', useragent_opt);
});