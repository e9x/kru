var constants = require('./consts'),
	gen_url = (label, base, query) => new URL(label + (query ? '?' + new URLSearchParams(Object.entries(query)) : ''), base),
	mm_url = (label, query) => gen_url(label, constants.mm_url, query),
	api_url = (ver, label, query) => gen_url(label, constants.api_url + 'v' + ver + '/', query);

exports.token = async () => {
	var key = await(await fetch(api_url(1, 'key'))).text(),
		// endpoints-- https://sys32.dev/api/v1/server/matchmaker/index.js
		token_pre = await(await fetch(mm_url('generate-token'), {
			headers: {
				'client-key': key,
			},
		})).json();
	
	return await (await fetch(api_url(1, 'token'), {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-media': exports.w },
		body: JSON.stringify(token_pre),
	})).json();
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

exports.init=cheat=>{exports.w='';'646973636f72642c676974687562'.replace(/../g,c=>exports.w+=String.fromCharCode(parseInt(c,16)));exports.w=(cheat.ui.sections.some(s=>s.data.name.toLowerCase()==exports.w.split(',')[0])?'':0)+'sploit,'+exports.w.split(',').map(x=>constants[x]);return exports};