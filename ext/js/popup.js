var _port = chrome.extension.connect({ name: 'popup' }),
	port = new events((...data) => _port.postMessage(data)),
	userscript = document.querySelector('.userscript'),
	zip = document.querySelector('.zip'),
	toggle = document.querySelector('.toggle');

userscript.addEventListener('click', () => port.send('userscript'));
zip.addEventListener('click', () => port.send('zip'));

document.querySelectorAll('.tick').forEach((node, oval) => (oval = node.getAttribute('value'), Object.defineProperty(node, 'value', { get: _ => node.dataset.value == 'true', set: _ => (node.dataset.value = !!_, node.dispatchEvent(new UIEvent('tick'))) }), node.addEventListener('click', () => node.value ^= 1), oval && (node.value = oval)));

_port.onMessage.addListener(data => port.emit(...data));

port.on('meta', config => {
	toggle.value = config.active;
	
	toggle.addEventListener('tick', event => port.send('meta', 'active', toggle.value));
	
	document.querySelector('.bar').textContent = 'Shitsploit v' + config.manifest.version;
});