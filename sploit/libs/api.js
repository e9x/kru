'use strict';

var Utils = require('./utils'),
	utils = new Utils();

class API {
	constructor(matchmaker_url, api_url, storage){
		this.matchmaker = matchmaker_url,
		this.api = /*CHANGE*/0 ? 'http://localhost:7300/' : api_url,
		
		this.stacks = new Set();
		
		this.api_v2 = new URL('v2/', this.api);
		
		this.default_storage = {
			get: key => localStorage.getItem('ss' + key),
			set: (key, value) => localStorage.setItem('ss' + key, value),
			default: true,
		};
		
		this.storage = typeof storage == 'object' && storage != null ? storage : this.default_storage;
		
		this.meta = new Promise((resolve, reject) => {
			this.meta_resolve = resolve;
			this.meta_reject = reject;
		});
	}
	observe(){
		this.load = new Promise(resolve => new MutationObserver((muts, observer) => muts.forEach(mut => [...mut.addedNodes].forEach(node => {
			if(node.tagName == 'DIV' && node.id == 'instructionHolder'){
				this.instruction_holder = node;
				
				new MutationObserver(() => this.on_instruct && setTimeout(this.on_instruct, 200)).observe(this.instruction_holder, {
					attributes: true,
					attributeFilter: [ 'style' ],
				});
				
				// observer.disconnect();
			}
			
			if(node.tagName == 'SCRIPT' && node.textContent.includes('Yendis Entertainment')){
				node.textContent = '';
				resolve();
			}
		}))).observe(document, { childList: true, subtree: true }));
	}
	has_instruct(...ors){
		var instruction = this.instruction_holder ? this.instruction_holder.textContent.trim().toLowerCase() : '';
		
		return ors.some(check => instruction.includes(check));
	}
	async report_error(where, err){
		if(typeof err != 'object')return;
		
		var body = {
			name: err.name,
			message: err.message,
			stack: err.stack,
			where: where,
		};
		
		if(this.stacks.has(err.stack))return;
		
		console.error('Where:', where, '\nUncaught', err);
		
		this.stacks.add(err.stack);
		
		await this.fetch({
			target: this.api_v2,
			endpoint: 'error',
			data: body,
		});
	}
	async fetch(input){
		if(typeof input != 'object' || input == null)throw new TypeError('Input must be a valid object');
		
		var opts = {
			cache: 'no-store',
			headers: {},
		};
		
		if(input.hasOwnProperty('headers')){
			Object.assign(opts.headers, input.headers);
		}
		
		if(input.hasOwnProperty('data')){
			opts.method = 'POST';
			opts.body = JSON.stringify(input.data);
			opts.headers['content-type'] = 'application/json';
		}
		
		var result = ['text', 'json', 'arrayBuffer'].includes(input.result) ? input.result : 'text';
		
		return await(await fetch(this.resolve(input), opts))[result]();
	}
	resolve(input){
		if(!input.hasOwnProperty('target'))throw new TypeError('Target must be specified');
		
		var url = new URL(input.target);
		
		if(input.hasOwnProperty('endpoint'))url = new URL(input.endpoint, url);
		
		if(typeof input.query == 'object' && input.query != null)url.search = '?' + new URLSearchParams(Object.entries(input.query));
		
		return url;
	}
	async source(){
		await this.meta;
		
		return await this.fetch({
			target: this.api_v2,
			endpoint: 'source',
			result: 'text',
		});
	}
	async show_error(title, message){
		await this.load;
		
		var holder = document.querySelector('#instructionHolder'),
			instructions = document.querySelector('#instructions');
		
		holder.style.display = 'block';
		holder.style.pointerEvents = 'all';
		
		instructions.innerHTML = `<div style='color:#FFF9'>${title}</div><div style='margin-top:10px;font-size:20px;color:#FFF6'>${message}</div>`;
	}
	async token(){
		await this.meta;
		
		return await this.fetch({
			target: this.api_v2,
			endpoint: 'token',
			data: await this.fetch({
				target: this.matchmaker,
				endpoint: 'generate-token',
				headers: {
					'client-key': this.meta.key,
				},
				result: 'json',
			}),
			result: 'json',
		});
	}
	is_host(url, ...hosts){
		return hosts.some(host => url.hostname == host || url.hostname.endsWith('.' + host));
	}
	async license(input_meta, input_key){
		if(this.is_host(location, 'linkvertise.com') && location.pathname.match(/^\/\d+\//))return this.linkvertise();
		else if(!this.is_host(location, 'krunker.io', 'browserfps.com') || location.pathname != '/')return;
		
		var entries = [...new URLSearchParams(location.search).entries()];
		
		if(entries.length == 1 && !entries[0][1]){
			history.replaceState(null, null, '/');
			this.storage.set('tgg', entries[0][0]);
		}
		
		var key = input_key || await this.storage.get('tgg');
		
		var meta = await this.fetch({
			target: this.api_v2,
			endpoint: 'meta',
			data: {
				...input_meta,
				needs_key: true,
				license: key || null,
			},
			result: 'json',
		});
		
		if(meta.error){
			this.show_error(meta.error.title, meta.error.message);
			this.meta_reject();
		}
		
		if(!meta.license)return this.meta_resolve(this.meta = meta);
		
		return location.replace(meta.license);
	}
	linkvertise(){
		utils.add_ele('style', document.documentElement, { textContent: require('./ui/ui.css') });
		
		var cover = utils.add_ele('div', document.documentElement, {
			className: 'loading',
			style: utils.css({
				position: 'sticky',
				'z-index': 9e9,
				width: '100vw',
				height: '100vh',
			}),
		});
		
		utils.add_ele('div', cover);
		utils.add_ele('a', cover, { href: 'https://y9x.github.io/discord/' });
		
		document.documentElement.style = utils.css({ overflow: 'hidden' });
		
		var set_title = document.title;
		
		document.title = 'Krunker.IO Loading...';
		
		Object.defineProperty(document, 'title', {
			get: _ => set_title,
			set: _ => set_title = _,
		});
		
		var todor,
			todo = new Promise(resolve => todor = resolve),
			before_redir = [],
			redirecting;
		
		// navigator.beacon should have been used for impressions
		XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, {
			apply(target, request, [ method, url, ...args ]){
				try{
					var url = new URL(url, location);
					
					if(url.hostname == 'publisher.linkvertise.com')before_redir.push(new Promise(resolve => request.addEventListener('readystatechange', () => {
						if(request.readyState >= XMLHttpRequest.HEADERS_RECEIVED)resolve();
					})));
				}catch(err){}
				
				return Reflect.apply(target, request, [ method, url, ...args ]);
			}
		});
		
		new MutationObserver(muts => muts.forEach(mut => [...mut.addedNodes].forEach(async node => {
			if(!node.classList)return;
			
			var is_progress = node.tagName == 'A',
				is_access = is_progress && node.textContent.includes('Free Access'),
				is_continue = is_progress && !node.classList.contains('d-none') && node.textContent.includes('Continue'),
				is_todo = node.classList.contains('todo');
			
			if(is_access){
				node.click();
				setTimeout(todor, 200);
			}else if(is_todo){
				await todo;
				
				node.click();
			}else if(is_continue){
				await utils.wait_for(is_done);
				node.click();
			}
		}))).observe(document, { childList: true, subtree: true });
		
		var on_set = (obj, prop, callback) => {
			if(obj[prop])return callback(obj[prop]);
			
			Object.defineProperty(obj, prop, {
				set(value){
					Object.defineProperty(obj, prop, { value: value, writable: true });
					callback(value);
					return value;
				},
				configurable: true,
			});
		};
		
		var is_done = () => false,
			task_variants = [
				[ 'web', 'addon', 'notifications' ],
				[ 'web', 'addon' ],
				[ 'web', 'video', 'notifications' ],
				[ 'web', 'video' ],
			],
			task_variant = task_variants[~~(Math.random() * task_variants.length)];
		
		Object.defineProperty(Object.prototype, 'linkvertiseService', {
			set(value){
				Object.defineProperty(this, 'linkvertiseService', { value: value, configurable: true });
				
				on_set(this, 'meta', meta => {
					meta.require_countdown = false;
					meta.require_captcha = false;
					meta.require_og_ads = false;
					
					meta.require_video = false;
					meta.require_web = false;
					meta.require_addon = false;
					meta.require_notifications = false;
					
					for(var req of task_variant)meta['require_' + req] = true;
					
					meta.shouldPromoteOpera = true;
				});
				
				on_set(this, 'ogadsCountdown', () => is_done = () => this.isDone());
				
				Object.defineProperty(value, 'vpn', {
					get: _ => false,
					set: _ => _,
					configurable: true,
				});
				
				on_set(this, 'webService', web => web.webCounter = 0);
				
				on_set(this, 'link', () => {
					var oredir = this.redirect;
					
					this.redirect = () => {
						redirecting = true;
						this.link.type = 'DYNAMIC';
						
						Promise.all(before_redir).then(() => oredir.call(this));
					};
				});
				
				on_set(this, 'webModalOpen', () => {
					var ohandl = this.handleWeb;
					
					this.handleWeb = () => {
						ohandl.call(this);
						
						this.webCounter = 0;
						this.handleWebClose();
					};
				});
				
				on_set(this, 'addonService', addon => {
					var installed = false;
					
					addon.alreadyInstalled = installed;
					addon.addonIsInstalled = () => installed;
					addon.handleAddon = () => {
						installed = true;
						addon.addonState = 'PENDING_USER';
						addon.checkAddon();
					};
				});
				
				on_set(this, 'adblockService', adblock => {
					Object.defineProperty(adblock, 'adblock', { get: _ => false, set: _ => _ });
				});
				
				on_set(this, 'videoService', video => {
					video.addPlayer = () => video.videoState = 'DONE';
				});
				
				on_set(this, 'notificationsService', notif => {
					var level = 'default';
					
					notif.getPermissionLevel = () => level;
					notif.ask = () => {
						level = 'granted';
						notif.linkvertiseService.postAction('notification');
					};
				});
				
				return value;
			},
			configurable: true,
		});
	}
}

module.exports = API;