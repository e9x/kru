'use strict';
var fs = require('fs'),
	path = require('path'),
	webpack = require('webpack'),
	Asar = require('./asar'),
	patch_asar = async (file, output) => {
		var asar = new Asar();
		
		await asar.open(file);
		
		var electron_package = JSON.parse(await asar.readFile('package.json'));
		
		if(!electron_package.main)throw new Error('Could not locate electron entry');
		
		console.log('Electron entry found:', electron_package.main);
		
		var main = (await asar.readFile(electron_package.main)).toString();
		
		console.log('Entry loaded');
		
		var id = Math.random();
		
		await asar.insertFolder(path.join(__dirname, 'insert'), id);
		
		console.log('Folder inserted as', id);
		
		var new_entry = id + '/index.js',
			relative = path.posix.relative(asar.resolve(new_entry, true), asar.resolve(electron_package.main, true));
		
		await asar.writeFile(id + '/main.json', JSON.stringify(electron_package.main, true));
		
		electron_package.main = new_entry;
		
		await asar.writeFile('package.json', JSON.stringify(electron_package));
		
		await asar.save(output);
		
		console.log('Saved');
	};

patch_asar(path.join(__dirname, 'input.asar'), path.join(__dirname, 'app.asar'));