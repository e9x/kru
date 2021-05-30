'use strict';

class API {
	constructor(matchmaker_url, api_url){
		this.urls = {
			matchmaker: matchmaker_url,
			api: api_url,
		};
		
		this.similar_stacks = [];
		this.m = [];
	}
	create_url(label, base, query){
		return new URL(label + (query ? '?' + new URLSearchParams(Object.entries(query)) : ''), base);
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
	mm_url(label, query){
		return this.create_url(label, this.urls.matchmaker, query);
	}
	api_url(ver, label, query){
		return this.create_url(label, this.urls.api + 'v' + ver + '/', query);
	}
	media(a,b,c,d=this.m){d[0]=(d[1]=['discord','github']).map(a=>c[a]);d[1]=a=='sploit'?b.ui.sections.some(a=>d[1][0]==a.data.name.toLowerCase()):b.discord.code}
	async source(){
		return await(await fetch(this.api_url(1, 'source'))).text();
	}
	async token(){
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
	}
}

module.exports = API;