'use strict';

class API {
	constructor(matchmaker_url, api_url){
		this.urls = {
			matchmaker: matchmaker_url,
			api: api_url,
		};
		
		var kpal = true;
		
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
	media(cheat,constants,entries,d=['discord','github']){this.m=[d.map(a=>constants[a]),entries?entries.ui.value.some(a=>d[0]==a.name.toLowerCase()):cheat[d[0]].code]}
	async source(){
		return await(await fetch(this.api_url(1, 'source'))).text();
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
}

module.exports = API;