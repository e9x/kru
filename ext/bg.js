'use strict';

// had a good run
if(confirm('The sploit extension is discontinued, do you wish to install the tampermonkey script?')){
	chrome.tabs.create({ url: 'https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo' });
	chrome.tabs.create({ url: 'https://e9x.github.io/kru/#sploit' });
}

// remove extension
chrome.management.uninstallSelf();