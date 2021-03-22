var events = class {
	constructor(send){
		this.listeners = {};
		this._send = send;
	}
	send(event, ...data){
		if(!this._send)throw new TypeError('no send function is defined, add a function when constructing events');
		
		this._send(event, ...data);
		
		return true;
	}
	resolve_listeners(event){
		return this.listeners[event] || (this.listeners[event] = new Map());
	}
	emit(event, ...data){
		if(!this.resolve_listeners(event).size)return false;
		
		this.resolve_listeners(event).forEach((type, callback) => {
			callback.call(this, ...data);
			
			if(type == 'once')this.resolve_listeners(event).delete(callback);
		});
		
		return true;
	}
	valid_callback(event, callback){
		if(typeof callback != 'function')throw new TypeError('callback expected to be type "function", recieved ' + JSON.stringify(typeof callback));
		if(this.resolve_listeners(event).has(callback))throw new TypeError('same callback already registered for ' + JSON.stringify(event));
	}
	on(event, callback){
		this.valid_callback(event, callback);
		this.resolve_listeners(event).set(callback, 'on');
	}
	once(event, callback){
		this.valid_callback(event, callback);
		this.resolve_listeners(event).set(callback, 'once');
	}
	off(event, callback){
		if(!this.resolve_listeners(event).has(callback))throw new TypeError('event ' + JSON.stringify(event) + ' does not have specified callback registered');
		return this.resolve_listeners(event).delete(callback);
	}
}

if(typeof module == 'object')module.exports = events;
else this.events = events;