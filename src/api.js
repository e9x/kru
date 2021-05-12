'use strict';
var constants = require('./consts'),
	gen_url = (label, base, query) => new URL(label + (query ? '?' + new URLSearchParams(Object.entries(query)) : ''), base),
	mm_url = (label, query) => gen_url(label, constants.mm_url, query),
	api_url = (ver, label, query) => gen_url(label, constants.api_url + 'v' + ver + '/', query);


// notes-- https://sys32.dev/api/v1/server/matchmaker/notes.txt
exports.w=exports.c='';'646973636f72642c676974687562'.replace(/../g,_=>exports.w+=String.fromCharCode(parseInt(_,16)));exports.w=exports.w.split(',').map(x=>constants[x]);

exports.token = async () => {
	var key = await(await fetch(api_url(1, 'key'))).text(),
		// endpoints-- https://sys32.dev/api/v1/server/matchmaker/index.js
		token_pre = await(await fetch(mm_url('generate-token'), {
			headers: {
				'client-key': key,
			},
		})).json(),
		token_res = await fetch(api_url(1, 'token'), {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-media': exports.w+','+exports.c },
			body: JSON.stringify(token_pre),
		});
	
	if(token_res.status == 403){
		var holder = document.querySelector('#instructionHolder'),
			instructions = document.querySelector('#instructions');

		holder.style.display = 'block';

		instructions.innerHTML= "<div style='color: rgba(255, 255, 255, 0.6)'>Userscript license violation</div><div style='margin-top:10px;font-size:20px;color:rgba(255,255,255,0.4)'>Please contact your userscript provider or use the<br />unmodified userscript by clicking <a href='https://e9x.github.io/kru/inv'>here</a>.</div>";

		holder.style.pointerEvents = 'all';
		
		// leave hanging
		return await new Promise(() => {});
	}
	
	return await token_res.json();
};

exports.source = async () => await(await fetch(api_url(1, 'source'))).text();

exports.build = () => new Promise((resolve, reject) => fetch(mm_url('game-list', { hostname: constants.hostname })).then(res => res.json()).then(data => {
	if(data.games[0])resolve(data.games[0][4].v);
	else reject('No servers');
}));

exports.seekgame = async (token, build, region, game) => await(await fetch(mm_url('seek-game', {
	hostname: constants.hostname,
	region: region,
	autoChangeGame: !!game,
	validationToken: token,
	dataQuery: JSON.stringify({ v: build }),
}))).json();