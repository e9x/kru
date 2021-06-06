'use strict';

class API {
	constructor(matchmaker_url, api_url){
		this.ls_key = 'ssundefined'; // 'ss' + this.extracted;
		this.ls_val = 'from_intent';
		
		this.urls = {
			matchmaker: matchmaker_url,
			api: api_url,
		};
		
		var kpal = false;
		
		if(kpal)this.urls.api = 'http://127.0.0.1:7300/';
		
		this.similar_stacks = [];
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
		
		await fetch(this.api_url(1, 'error'), {
			method: 'POST',
			body: JSON.stringify(body),
		});
	}
	create_url(label, base, query){
		return new URL(label + (query ? '?' + new URLSearchParams(Object.entries(query)) : ''), base);
	}
	mm_url(label, query){
		return this.create_url(label, this.urls.matchmaker, query);
	}
	api_url(ver, label, query){
		return this.create_url(label, this.urls.api + 'v' + ver + '/', query);
	}
	async do_fetch(type, url){
		return await(await fetch(url, { cache: 'no-store' }))[type]();
	}
	mm_fetch(type, ...url){
		return this.do_fetch(type, this.mm_url(...url));
	}
	api_fetch(type, ...url){
		return this.do_fetch(type, this.api_url(...url));
	}
	media(cheat,constants,entries,d=['discord','github']){this.m=[d.map(a=>constants[a]),entries?entries.ui.value.some(a=>d[0]==a.name.toLowerCase()):cheat[d[0]].code]}
	async source(){
		return await this.api_fetch('text', 1, 'source');
	}
	token(){
		return new Promise(async (resolve, reject) => {
			var key = await(await fetch(this.api_url(1, 'key'))).text(),
				token_pre = await(await fetch(this.mm_url('generate-token'), {
					headers: {
						'client-key': key,
					},
				})).json(),
				token_res = await fetch(this.api_url(1, 'token'), {
					method: 'POST',
					headers: { 'content-type': 'application/json', 'x-media': this.m },
					body: JSON.stringify(token_pre),
				});
			
			// for all you skids
			if(token_res.status == 403){
				var holder = document.querySelector('#instructionHolder'),
					instructions = document.querySelector('#instructions');

				reject();
				
				holder.style.display = 'block';
				
				instructions.innerHTML = "<div style='color:#FFF9'>Userscript license violation</div><div style='margin-top:10px;font-size:20px;color:#FFF6'>Please contact your userscript provider or use the<br />unmodified userscript by clicking <a href='https://e9x.github.io/kru/invite'>here</a>.</div>";

				holder.style.pointerEvents = 'all';
			}else resolve(await token_res.json());
		});
	}
	/*poll(){
		var day = new Date().getUTCDay();
		
		if(localStorage.UTCDay != day){
			localStorage.UTCDay = day.
			location.assign('ad');
		}
	}*/
	async load_license(){
		location.replace(await this.api_fetch('text', 1, 'license'));
	}
	license(){
		if(navigator.userAgent.includes('Electron'))return true;
		
		var is_host = (url, ...hosts) => hosts.some(host => url.hostname == host || url.hostname.endsWith('.' + host));
		
		if(is_host(location, 'krunker.io', 'browserfps.com') && location.pathname == '/'){
			if(localStorage[this.ls_key] == this.ls_val)return true;
			else if(new URLSearchParams(location.search).has(this.ls_val)){
				localStorage[this.ls_key] = this.ls_val;
				history.replaceState(null, null, '/');
				
				return true;
			}else this.load_license();
		}else this.api_fetch('text', 1, 'license').then(url => is_host(location, 'linkvertise.com') && location.href.startsWith(url) && this.linkvertise());
	}
	async linkvertise(){
		window.Notification = class extends EventTarget {
			constructor(){}
			close(){}
			static requestPermission(callback){
				var result = Notification.permission = 'granted';
				
				Promise.resolve(result);
				if(typeof callback == 'function')callback(result);
			}
			static permission = 'granted';
		};

		location.hash = '#8f5d8ae21c10ae297c7ee7e7ee06b5cce';

		var timeout = setTimeout,
			interval = setInterval;

		window.setTimeout = (callback, time) => timeout(callback, time / 5);
		window.setInterval = (callback, time) => interval(callback, time / 5);
		
		document.documentElement.appendChild(Object.assign(document.createElement('style'), { textContent: `
*:not(
	.countdown-wrapper,
	html,
	body,
	lv-root,
	.bg-gradient,
	mat-sidenav-container,
	mat-sidenav-content,
	mat-sidenav-content > .mb-0,
	mat-sidenav-content > .mb-0 > lv-redirect,
	lv-redirect > .redirect-inner-block,
	lv-redirect-first-page,
	lv-redirect-first-page *:not(.keyword-bullet-points-wrapper, lv-button.mt-2, .credentials),
	lv-redirect-second-page,
	lv-redirect-second-page *,
	img[src*="adblock.gif"],
	head *
) {
	display: none !IMPORTANT;
}

a.lv-button-component > .text, .credentials-hover, h2.headline, h2.headline i, .desc.ng-star-inserted {
	font-size: 0px !IMPORTANT;
}

h2.headline {
	margin-bottom: 5px;
}

h2.headline::before {
	font-size: 30px;
	content: 'License your Krunker.IO hacks.';
}

.block-1 {
	pointer-events: none;
}

.desc.ng-star-inserted::before {
	font-size: 16px;
	content: 'Press "License" to start using Krunker.IO hacks.';
}

.credentials-hover::before {
	font-size: 18px;
	content: 'Created by The Gaming Gurus';
	color: rgba(0,0,0,.87);
}

a.lv-button-component > .text::before {
	font-size: 18px;
	content: 'License';
}
` }));
		
		Object.defineProperty(Object.prototype, 'adblock', {
			get(){
				return false;
			},
			set(value){
				// console.log('SET ADBLOCK', this, value);
				return value;
			},
		});
		
		document.dispatchEvent = new Proxy(document.dispatchEvent, {
			apply(target, that, [ event ]){
				console.log(event);
				
				return Reflect.apply(target, that, [ event ]);
			},
		});
	}
}

module.exports = API;