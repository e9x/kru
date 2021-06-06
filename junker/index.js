'use strict';

var { krunker, updater, api, main, ...constants } = require('./consts');

if(krunker && api.license()){
	api.media(main,constants);
		
	var sourcePromise = api.source(),
		tokenPromise = api.token();
	
	let mutationObserver = new MutationObserver(mutations => {
		for(let mutation of mutations)for(let node of mutation.addedNodes){
			if(node.tagName === 'SCRIPT' && node.type === "text/javascript" && node.innerHTML.startsWith("*!", 1)){
				node.innerHTML = 'window._debugTimeStart=Date.now()';
				
				sourcePromise.then(source => {
					main.gameLoad(source, tokenPromise);
					main.createSettings();
					main.gameHooks();
				});
				
				mutationObserver.disconnect();
			}
		}
	});
	
	mutationObserver.observe(document, {
		childList: true,
		subtree: true
	});
	
	window.addEventListener('load', () => {
		updater.watch(() => {
			if(confirm('A new Junker version is available, do you wish to update?'))updater.update();
		}, 60e3 * 3);	
	});
}