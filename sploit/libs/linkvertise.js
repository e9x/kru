'use strict';

var interval = setInterval,
	todor,
	todo = new Promise(resolve => todor = resolve),
	contr,
	cont = new Promise(resolve => contr = resolve),
	wait_for = (check, time = 50) => {
		return new Promise(resolve => {
			var interval,
				run = () => {
					try{
						if(check()){
							if(interval)clearInterval(interval);
							resolve();
							return true;
						}
					}catch(err){console.log(err)}
				};
			
			interval = run() || setInterval(run, time);
		});
	},
	continued;

new MutationObserver(muts => muts.forEach(mut => [...mut.addedNodes].forEach(async node => {
	if(!node.classList)return;
	
	var is_progress = node.tagName == 'A',
		is_access = is_progress && node.textContent.includes('Free Access'),
		is_continue = is_progress && node.textContent.includes('Continue'),
		is_todo = node.classList.contains('todo'),
		is_web = is_todo && node.classList.contains('web');
	
	if(is_access){
		node.click();
		setTimeout(todor, 250);
	}else if(is_todo){
		await todo;
		
		// close articles
		if(is_web)setInterval(() => {
			for(var node of document.querySelectorAll('.modal .web-close-btn'))node.click();
		}, 100);
		
		window.setInterval = (callback, time) => interval(callback, time == 1e3 ? 0 : time);
		
		node.click();
		
		setTimeout(contr, 1000);
	}else if(is_continue){
		await cont;
		if(!continued)node.click(), continued = true;
	}
}))).observe(document, {
	childList: true,
	subtree: true,
});

new MutationObserver((muts, observer) => muts.forEach(mut => [...mut.addedNodes].forEach(async node => {
	if(node.tagName == 'A')node.target = '_self';
}))).observe(document, {
	attributes: true,
	attributeFilter: [ 'href' ],
});

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
	},
	ons = service => {
		console.log(service);
		
		on_set(service, 'webService', web => {
			console.log('web service:', web);
			
			web.webCounter = 0;
		});
		
		on_set(service, 'ogadsCountdown', () => {
			console.log('ogads service:', service);
			
			var oredir = service.redirect;
			
			service.redirect = () => {
				service.link.type = 'DYNAMIC';
				setTimeout(() => oredir.call(service), 100);
			};
		});
		
		on_set(service, 'addonService', addon => {
			console.log('addon service:', addon);
			
			var installed = false;
			
			addon.alreadyInstalled = installed;
			addon.addonIsInstalled = () => installed;
			addon.handleAddon = () => {
				installed = true;
				addon.addonState = 'PENDING_USER';
				addon.checkAddon();
			};
		});
		
		on_set(service, 'adblockService', adblock => {
			console.log('adblock service:', adblock);
			
			Object.defineProperty(adblock, 'adblock', { get: _ => false, set: _ => _ });
		});
		
		on_set(service, 'videoService', video => {
			console.log('video service:', video);
			
			video.addPlayer = () => video.videoState = 'DONE';
		});
		
		on_set(service, 'notificationsService', notif => {
			console.log('notification service:', service);
			
			var level = 'default';
			
			notif.getPermissionLevel = () => level;
			notif.ask = () => {
				level = 'granted';
				notif.linkvertiseService.postAction('notification');
			}
		});
	};

Object.defineProperty(Object.prototype, 'linkvertiseService', {
	set(value){
		Object.defineProperty(this, 'linkvertiseService', { value: value, configurable: true });
		
		ons(this);
		
		return value;
	},
	configurable: true,
});