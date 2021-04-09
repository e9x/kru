'use strict';
var fs = require('fs'),
	path = require('path'),
	screen = nw.Screen.screens[0],
	center = size => (size.x = ~~(screen.bounds.width / 2 - size.width / 2), size.y = ~~(screen.bounds.height / 2 - size.height / 2), size);

nw.Window.open('https://krunker.io/', center({
	width: ~~(screen.bounds.width * 0.8),
	height: ~~(screen.bounds.height * 0.7),
}), win => {
	win.on('close', () => nw.App.quit());
	
	win.on('document-start', window => window.parent == window && (window.location.hostname == 'krunker.io' || window.location.hostname.endsWith('.krunker.io')) && window.location.pathname == '/' && new window.Function(fs.readFileSync(path.join(__dirname, '..', 'sploit.user.js')).toString())());
});