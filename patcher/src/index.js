var fs = require('original-fs'),
	path = require('path'),
	Asar = require('./asar'),
	electron = require('electron'),
	util = require('util'),
	Utils = require('./util'),
	utils = new Utils(),
	config = {
		data: [],
		default: [
			{
				name: 'Krunker',
				path: path.join(process.env.PROGRAMFILES, 'Yendis Entertainment Pty Ltd', 'Official Krunker.io Client'),
				icon: 'clients/krunker.png',
			},
			{
				name: 'KPal',
				path: path.join(process.env.LOCALAPPDATA, 'Programs', 'kpal_client'),
				icon: 'clients/kpal.png',
			},
			{
				name: 'MTZ',
				icon: 'clients/mtz.png',
				path: 'C:/Program Files/MTZ',
			},
			{
				name: 'idkr',
				path: 'C:/Program Files/idkr',
				icon: 'clients/idkr.png',
			},
			
		],
		async save(){
			await fs.promises.writeFile(this.file, JSON.stringify(this.data));
		},
		async load(){
			this.file = path.join(await electron.ipcRenderer.invoke('user-data'), 'clients.json');
			return this.data = JSON.parse(await fs.promises.readFile(this.file).catch(err => (console.error(err), JSON.stringify(this.default))));
		},
	},
	node_tree = (nodes, parent = document) => {
		var output = {
				parent: parent,
			},
			match_container = /^\$\s+>?/g,
			match_parent = /^\^\s+>?/g;
		
		for(var label in nodes){
			var value = nodes[label];
			
			if(value instanceof Node)output[label] = value;
			else if(typeof value == 'object')output[label] = node_tree(value, output.container);
			else if(match_container.test(nodes[label])){
				if(!output.container){
					console.warn('No container is available, could not access', value);
					continue;
				}
				
				output[label] = output.container.querySelector(nodes[label].replace(match_container, ''));
			}else if(match_parent.test(nodes[label])){
				if(!output.parent){
					console.warn('No parent is available, could not access', value);
					continue;
				}
				
				output[label] = output.parent.querySelector(nodes[label].replace(match_parent, ''));
			}else{
				output[label] = document.querySelector(nodes[label]);
			}
			
			if(!output[label])console.warn('No node found, could not access', value);
		}
		
		return output;
	},
	nodes = node_tree({
		container: '.app',
		overlay: '$ > .overlay',
		clients: {
			container: '.clients',
			template_card: '$ > .card',
			template_panel: '^ > .panel',
			add: '$ > .card:nth-child(2)',
		},
		bar: {
			container: '.bar',
			close: '$ > .actions > .close',
			reset: '$ > .toolbar > .reset',
			github: '$ > .toolbar > .github',
		},
	});

nodes.clients.add.addEventListener('click', async () => {
	var folder = await Client.select_folder();
	
	config.data.push(new Client({
		icon: 'clients/krunker.png',
		name: path.basename(folder),
		path: folder,
	}));
	
	await config.save();
});

class Client {
	static async valid_electron(folder){
		return await fs.promises.access(path.join(folder, 'resources', 'app.asar')).then(() => true).catch(() => false);
	}
	static async select_folder(){
		var test = async () => {
			var folder = (await electron.ipcRenderer.invoke('dialog', 'openDirectory')).filePaths[0];
			
			if(!folder)throw new Error('Cannot select folder');
			
			if(!(await Client.valid_electron(folder)))return alert('Invalid electron folder! Select the folder with your client exe'), await Client.select_folder();
			
			return folder;
		};
		
		return await test();		
	}
	static async select_file(){
		var test = async () => {
			var file = (await electron.ipcRenderer.invoke('dialog', 'openFile')).filePaths[0];
			
			if(!file)throw new Error('Cannot select file');
			
			return file;
		};
		
		return await test();		
	}
	constructor(data){
		this.key = 'kpalstinks';
		this.focused = false;
		this.name = data.name;
		this.path = data.path;
		this.icon = data.icon;
		
		this.card = node_tree({
			container: nodes.clients.container.appendChild(nodes.clients.template_card.cloneNode(true)),
			label: '$ > .label',
			image: '$ > .image',
		});
		
		this.panel = node_tree({
			container: nodes.container.appendChild(nodes.clients.template_panel.cloneNode(true)),
			info: {
				container: '^ > .info',
				patched: '$ .patched',
				running: '$ .running',
				name: '$ .name',
				icon: '$ .icon',
				path: '$ .path',
			},
			actions: {
				container: '^ .actions',
				play: '$ .play',
				stop: '$ .stop',
				browse: '$ .browse',
				remove: '$ .remove',
				patch: '$ .patch',
			},
			close: '$ > .close',
		});
		
		this.panel.close.addEventListener('click', () => this.blur());
		
		this.card.container.removeAttribute('style');
		
		this.update();
		
		setInterval(() => {
			if(this.focused)this.check();
		}, 1000);
		
		this.panel.info.name.addEventListener('input', async () => {
			this.name = this.panel.info.name.value;
			await config.save();
			await this.update();
		});
		
		this.panel.info.path.addEventListener('click', async () => {
			this.path = await Client.select_folder();
			await config.save();
			await this.update();
		});
		
		this.panel.info.icon.addEventListener('click', async () => {
			this.icon = await Client.select_file();
			await config.save();
			await this.update();
		});
		
		this.panel.actions.remove.addEventListener('click', () => this.remove());
		
		this.card.container.addEventListener('click', () => this.focus());
		
		this.panel.actions.patch.addEventListener('click', async () => {
			if(await this.patched())this.unpatch();
			else this.patch();
		});
		
		this.panel.actions.stop.addEventListener('click', async () => {
			await utils.stop_process(path.basename(await this.get_binary_path()));
			await this.update();
		});
		
		this.panel.actions.browse.addEventListener('click', () => {
			electron.shell.openPath(this.path);
		});
		
		this.panel.actions.play.addEventListener('click', async () => {
			if(!(await utils.process_running(path.basename(await this.get_binary_path()))))electron.shell.openPath(await this.get_binary_path());
		});
	}
	get asar_path(){
		return path.join(this.path, 'resources', 'app.asar');
	}
	async get_binary_path(){
		var dir;
		
		try{
			dir = await fs.promises.readdir(this.path);
		}catch(err){
			this.path = await Client.select_folder();
			await config.save();
			dir = await fs.promises.readdir(this.path);
		}
		
		for(var file of dir)if(path.extname(file) == '.exe' && !file.startsWith('Uninstall '))return path.join(this.path, file);
		
		throw new Error('Could not locate binary..');
	}
	async remove(){
		config.data.splice(config.data.indexOf(this), 1);
		this.blur();
		this.card.container.remove();
		this.panel.container.remove();
		await config.save();
	}
	async update(){
		this.card.label.textContent = this.panel.info.name.value = this.name;
		this.panel.info.path.textContent = this.path;
		this.panel.info.icon.textContent = this.icon;
		this.card.image.style['background-image'] = 'url(' + JSON.stringify(this.icon) + ')';
		
		this.card.container.dataset.disabled = !(await this.exists());
		
		this.panel.actions.play.disabled = true;
		this.panel.actions.patch.disabled = true;
		this.panel.info.running.className = '';
		this.panel.info.running.textContent = '...';
		
		if(!this.focused)return this.panel.container.classList.remove('focused');
		
		// dont wait for, has a noticable delay
		this.check();
		
		this.panel.container.classList.add('focused');
	}
	async check(){
		var patched = await this.patched();
		
		this.panel.info.patched.className = patched + '';
		this.panel.info.patched.textContent = patched ? 'Yes' : 'No';
		
		this.panel.actions.patch.textContent = patched ? 'Unpatch' : 'Patch';
		
		var running = await utils.process_running(path.basename(await this.get_binary_path()));
		
		this.panel.info.running.className = running + '';
		this.panel.info.running.textContent = running ? 'Yes' : 'No';
		this.panel.actions.play.disabled = running;
		
		if(!this.patching)this.panel.actions.patch.disabled = running;
		
		this.panel.actions.stop.disabled = !running;
	}
	async focus(){
		if(this.card.container.dataset.disabled)await this.get_binary_path();
		
		this.focused = true;
		this.update();
		
		nodes.overlay.classList.add('visible');
	}
	blur(from_focus = false){
		this.focused = false;
		this.update();
		
		if(!from_focus)nodes.overlay.classList.remove('visible');
	}
	async patched(){
		var asar = new Asar();
		
		await asar.open(this.asar_path);
		
		return asar.exists(this.key);
	}
	async exists(){
		return this.path ? await fs.promises.access(this.path).then(() => true).catch(() => false) : false;
	}
	async unpatch(){
		var patch_message = this.panel.actions.patch.dataset.dtooltip;
		
		this.patching = true;
		this.panel.actions.patch.disabled = true;
		this.panel.actions.patch.dataset.dtooltip = 'Unpatching...';
		
		var asar = new Asar();
		
		await asar.open(this.asar_path);
		
		var electron_package = JSON.parse(await asar.read_file('package.json'));
		
		electron_package.main = JSON.parse(await asar.read_file(this.key + '/main.json'));
		
		await asar.write_file('package.json', JSON.stringify(electron_package));
		
		await asar.delete(this.key);
		
		try{
			await asar.save();
		}catch(err){
			alert(`Could not save modified asar, try relaunching Asar Patcher with administrator privileges. The error code was ${err.code} and the syscall was ${err.syscall}.`);
		}
		
		this.patching = false;
		this.panel.actions.patch.disabled = false;
		this.panel.actions.patch.dataset.dtooltip = patch_message;
	}
	async patch(){
		var patch_message = this.panel.actions.patch.dataset.dtooltip;
		
		this.patching = true;
		this.panel.actions.patch.disabled = true;
		this.panel.actions.patch.dataset.dtooltip = 'Patching...';
		
		var asar = new Asar();
		
		await asar.open(this.asar_path);
		
		var electron_package = JSON.parse(await asar.read_file('package.json'));
		
		await asar.insert_folder(path.join(__dirname, 'insert'), this.key);
		
		var new_entry = this.key + '/index.js',
			relative = path.posix.relative(asar.resolve(new_entry, true), asar.resolve(electron_package.main, true));
		
		await asar.write_file(this.key + '/main.json', JSON.stringify(electron_package.main, true));
		
		electron_package.main = new_entry;
		
		await asar.write_file('package.json', JSON.stringify(electron_package));
		
		try{
			await asar.save();
		}catch(err){
			alert(`Could not save modified asar, try relaunching Asar Patcher with administrator privileges. The error code was ${err.code} and the syscall was ${err.syscall}.`);
		}
		
		this.patching = false;
		this.panel.actions.patch.disabled = false;
		this.panel.actions.patch.dataset.dtooltip = patch_message;
	}
	toJSON(){
		return {
			path: this.path,
			icon: this.icon,
			name: this.name,
		};
	}
};

config.load().then(() => {
	config.data = config.data.map(data => new Client(data));
	
	document.body.addEventListener('click', event => {
		for(var client of config.data)if(client.focused && !client.card.container.contains(event.target) && !client.panel.container.contains(event.target))client.blur();
	});
	
	nodes.bar.reset.addEventListener('click', async () => {
		for(var client of [...config.data])await client.remove();
		
		config.data = config.default.map(data => new Client(data));
		
		await config.save();
	});
	
	nodes.bar.github.addEventListener('click', () => electron.shell.openExternal('https://github.com/e9x/kru/tree/master/patcher'));
});

nodes.bar.close.addEventListener('click', () => window.close());