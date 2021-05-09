var constants = require('./consts'),
	url = (ver, label) => new URL('v' + ver + '/' + label, constants.api_url);

exports.token = async () => {
	var key = await (await fetch(url(1, 'key'))).text(),
		token_pre = await (await fetch('https://matchmaker.krunker.io/generate-token', {
			headers: { 'client-key': key }
		})).json();
	
	return await (await fetch(url(1, 'token'), {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
		},
		body: JSON.stringify(token_pre),
	})).json();
};

exports.source = () => constants.request(url(1, 'source'));