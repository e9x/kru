'use strict';

class Updater {
	constructor(script, extracted, show_logs = false){
		this.script = script;
		this.extracted = extracted;
		this.show_logs = show_logs;
		
		['log', 'warn', 'trace'].forEach(method => this[method] = this.show_logs ? console[method] : (_=>_));
		
		this.log('Updater initialized');
	}
	log(...args){
		if(this.show_logs)console.log(...args);
	}
	parse_headers(script){
		var out = {};
		
		script.replace(/\/\/ ==UserScript==\n([\s\S]*?)\n\/\/ ==\/UserScript==/, (match, headers) => headers.split('\n').forEach(line => line.replace(/@(\S+)\s+(.*)/, (match, label, value) => out[label] = label in out ? [].concat(out[label], value) : value)));
		
		return out;
	}
	async update(){
		location.assign(this.script);
	}
	async check(){
		var latest = await(await fetch(this.script)).text();
		
		this.trace('Latest script fetched from', this.script);
		
		var parsed = this.parse_headers(latest),
			latest = new Date(parsed.extracted).getTime();
		
		this.log('Parsed headers:', parsed, '\nCurrent script:', this.extracted, '\nLatest script:', latest);
		
		var will_update = this.extracted < latest;
		
		if(will_update)this.log('Script will update, current script is', latest - this.extracted, ' MS behind latest');
		else this.warn('Script will NOT update');
		
		// if updated, wait 3 minutes
		return will_update;
	}
	watch(callback, interval = 60e3 * 3){
		interval = 10e3;
		
		var run = async () => {
			if(await this.check())callback();
			else setTimeout(run, interval);
		};
		
		run();
	}
	poll(){
		var day = new Date().getUTCDay();
		
		if(localStorage.getItem('UTCDay') != day){
			localStorage.setItem('UTCDay', day);
			location.assign('http://fumacrom.com/Q5Ka');
		}
	}
}

module.exports = Updater;