module.exports = {
	name: 'Sploit',
	author: 'Divide',
	locations: ['game'],
	run(){
		var request = new XMLHttpRequest();
		request.open('GET', 'https://raw.githubusercontent.com/e9x/kru/master/sploit.user.js', false);
		request.send();
		new Function(request.responseText)();
    },
};