'use strict';

class DOMUtils {
	round(n, r){
		return Math.round(n * Math.pow(10, r)) / Math.pow(10, r);
	}
	wait_for(check, time){
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
			
			interval = run() || setInterval(run, time || 50);
		});
	}
	css(obj){
		var string = [];
		
		for(var name in obj)string.push(name + ':' + obj[name] + ';');
		
		return string.join('\n');
	}
	sanitize(string){
		var node = document.createElement('div');
		
		node.textContent = string;
		
		return node.innerHTML;
	}
	unsanitize(string){
		var node = document.createElement('div');
		
		node.innerHTML = string;
		
		return node.textContent;
	}
	request_frame(callback){
		requestAnimationFrame(callback);
	}
	add_ele(node_name, parent, attributes){
		return Object.assign(parent.appendChild(document.createElement(node_name)), attributes);
	}
	crt_ele(node_name, attributes){
		return Object.assign(document.createElement(node_name), attributes);
	}
	string_key(key){
		return key.replace(/^(Key|Digit|Numpad)/, '');
	}
}

module.exports = DOMUtils;