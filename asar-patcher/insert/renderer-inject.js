module.exports = () => {
	var request = new XMLHttpRequest();
	request.open('GET', 'https://raw.githubusercontent.com/e9x/kru/master/sploit.user.js?' + Date.now(), false);
	request.send();
	new Function(request.responseText)();
};