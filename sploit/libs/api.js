'use strict';

class API {
	constructor(matchmaker_url, api_url, storage){
		this.matchmaker = matchmaker_url,
		this.api = api_url,
		
		this.similar_stacks = [];
		
		if(/*CHANGE*/0)this.api = 'http://localhost:7300/';
		
		this.api_v2 = new URL('v2/', this.api);
		
		this.idle = new Promise(() => {});
		
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
		
		if(this.similar_stacks.includes(err.stack))return;
		
		console.error('Where:', where, '\nUncaught', err);
		
		this.similar_stacks.push(err.stack);
		
		await this.fetch({
			target: this.api_v2,
			endpoint: 'error',
			data: body,
		});
	}
	async fetch(input){
		if(typeof input != 'object' || input == null)throw new TypeError('Input must be a valid object');
		if(!input.hasOwnProperty('target'))throw new TypeError('Target must be specified');
		
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
		
		var url = new URL(input.target);
		
		if(input.hasOwnProperty('endpoint'))url = new URL(input.endpoint, url);
		
		if(typeof input.query == 'object' && input.query != null)url.search = '?' + new URLSearchParams(Object.entries(input.query));
		
		var result = ['text', 'json', 'arrayBuffer'].includes(input.result) ? input.result : 'text';
		
		return await(await fetch(url, opts))[input.result]();
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
	is_krunker(){
		return this.is_host(location, 'krunker.io', 'browserfps.com') && location.pathname == '/';
	}
	linkvertise(){
		var todor,
			todo = new Promise(resolve => todor = resolve),
			contr,
			cont = new Promise(resolve => contr = resolve),
			before_redir = [],
			interval = setInterval;
		
		window.setInterval = (callback, time) => interval(callback, time == 1e3 ? 0 : time);
		
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
				is_continue = is_progress && node.textContent.includes('Continue'),
				is_todo = node.classList.contains('todo'),
				is_web = is_todo && node.classList.contains('web');
			
			if(is_access){
				node.click();
				setTimeout(todor, 200);
			}else if(is_todo){
				await todo;
				
				if(is_web)setInterval(() => {
					for(var node of document.querySelectorAll('.modal .web-close-btn'))node.click();
				}, 100);
				
				node.click();
				
				setTimeout(contr, 500);
			}else if(is_continue){
				await cont;
				if(!node.clicked)node.click(node.clicked = true);
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
		
		Object.defineProperty(Object.prototype, 'linkvertiseService', {
			set(value){
				Object.defineProperty(this, 'linkvertiseService', { value: value, configurable: true });
				
				on_set(this, 'webService', web => web.webCounter = 0);
				
				on_set(this, 'ogadsCountdown', () => {
					var oredir = this.redirect;
					
					this.redirect = () => {
						this.link.type = 'DYNAMIC';
						Promise.all(before_redir).then(() => oredir.call(this));
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
	async license(meta_input){
		var values = [...new URLSearchParams(location.search).values()],
			set_license = false;
		
		if(values.length == 1 && !values[0]){
			history.replaceState(null, null, '/');
			set_license = true;
		}
		
		var meta = await this.fetch({
			target: this.api_v2,
			endpoint: 'meta',
			data: {
				...meta_input,
				needs_key: true,
			},
			result: 'json',
		});
		
		if(meta.error){
			this.show_error(meta.error.title, meta.error.message);
			this.meta_reject();
		}
		
		var ok = () => this.meta_resolve(this.meta = meta);
		
		if(navigator.userAgent.includes('Electron'))return ok();
		
		if(this.is_krunker()){
			if(set_license)this.storage.set(meta.license.key, meta.license.value);
			if(
				this.default_storage.get('undefined') == meta.license.value ||
				await this.storage.get(meta.license.key) == meta.license.value
			)return ok();
			
			return location.replace(meta.license.url);
		}else this.is_host(location, 'linkvertise.com') && location.href.startsWith(meta.license.url) && this.linkvertise();
	}
}

module.exports = API;