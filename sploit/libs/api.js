'use strict';

class API {
	constructor(matchmaker_url, api_url){
		this.matchmaker = matchmaker_url,
		this.api = api_url,
		
		this.similar_stacks = [];
		
		if(/*CHANGE*/0)this.api = 'http://localhost:7300/';
		
		this.api_v2 = new URL('v2/', this.api);
		
		this.idle = new Promise(() => {});
		
		this.meta = new Promise((resolve, reject) => {
			this.meta_resolve = resolve;
			this.meta_reject = reject;
		});
		
		this.page_load = new Promise(resolve => new MutationObserver((muts, observer) => muts.forEach(mut => [...mut.addedNodes].forEach(node => {
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
		
		var request = await fetch(url, opts);
		
		try{
			return typeof input.result == 'string' ? await request[input.result]() : request;
		}catch(err){
			console.error('[FETCH]', url.href, err.message);
		}
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
		await this.page_load;
		
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
	async license(meta_input){
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
			if(localStorage[meta.license.key] == meta.license.value)return ok();
			else if(new URLSearchParams(location.search).has(meta.license.value)){
				localStorage[meta.license.key] = meta.license.value;
				history.replaceState(null, null, '/');
				ok();
			}else location.replace(meta.license.url);
		}else this.is_host(location, 'linkvertise.com') && location.href.startsWith(meta.license.url) && require('./linkvertise');
	}
}

module.exports = API;