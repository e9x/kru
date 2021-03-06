var port = chrome.extension.connect({ name: 'popup' }),
	userscript = document.querySelector('.userscript'),
	toggle = document.querySelector('.toggle');

userscript.addEventListener('click', () => port.postMessage([ 'userscript' ]));

document.querySelectorAll('.tick').forEach((node, oval) => (oval = node.getAttribute('value'), Object.defineProperty(node, 'value', { get: _ => node.dataset.value == 'true', set: _ => (node.dataset.value = !!_, node.dispatchEvent(new UIEvent('tick'))) }), node.addEventListener('click', () => node.value ^= 1), oval && (node.value = oval)));

port.onMessage.addListener(data => {
	var event = data.splice(0, 1)[0];
	
	switch(event){
		case'sploit':
			
			toggle.value = data[0].active;
			
			toggle.addEventListener('tick', event => {
				port.postMessage([ 'sploit', 'active', toggle.value ]);
			});
			
			break;
	}
});