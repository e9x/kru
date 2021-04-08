# Shitsploit

|||||
| --- | --- | --- |
| [Userscript](https://greasyfork.org/en/scripts/421228-sploit/) | [Discord](inv) | [Build quickstart](#building) |

# Resources:

## [Root folder](https://mega.nz/folder/PAcjzaYb#ITVrn9P7-0kRurX3MU969w)

Latest versions stored on sys32.dev are ran through terser for size reasons and are not beautified.

[Latest versions](https://api.sys32.dev/data/)

[Archived versions](https://mega.nz/folder/eE9ghBzS#nw_TzAoWnK9Cz5Sry-lECw)

## Leaked source:

[Deflated](https://mega.nz/folder/OJEgjLIJ#YEyz7VsyyjauZarD8JLldg)

[Source](https://mega.nz/file/uMN0hRoA#iAktwPcSWg0uCEW1jSf7N8XZIIXKy9h-RB_MMFmzV04)

## Original variables source:

Obfuscator.io was used temporarily as a replacement of randomizing variables (for the input side of things), if you are looking to steal some functions or viewing them then this is the way to go about

[Beautified](https://mega.nz/file/vJF0XDwa#1fjDUjWyBmtwUU-dN28A1PQ37u9HCDFFz2NTlqm1Ab0) where properties such as canSee and canBSeen remain

[Non-obfuscated reference](https://mega.nz/file/uEVmALhZ#Vlb6A5hR8IotmKXNZ6MjBIkBoCaa3wZkBj0552ihE7Y)

## API:

The endpoint at https://api.sys32.dev/token will provide you with a hashed matchmaking token you can then use for https://matchmaker.krunker.io/seek-game

Versions provided from sys32.dev automatically fetch matchmaking data

Latest version is always available at https://api.sys32.dev/latest.js

Example:
```js
// ==UserScript==
// @name          Krunker custom loader
// @namespace     https://e9x.github.io/
// @match         https://krunker.io/*
// @run-at        document-start
// ==/UserScript==

new MutationObserver((muts, observer) => muts.forEach(mut => [...mut.addedNodes].forEach(node => {
	if(node instanceof HTMLScriptElement && node.textContent.includes('Yendis Entertainment')){
		observer.disconnect();
		node.remove();
		fetch('https://api.sys32.dev/latest.js').then(res => res.text()).then(vries => new Function(vries)());
	}
}))).observe(document, { childList: true, subtree: true });
```

# Building

To build the userscript, you will need [NodeJS](https://nodejs.org/en/download/)
If you are on windows, download and unzip the repository and run `build.bat`

```sh
git clone https://github.com/e9x/kru.git sploit

cd sploit

npm install

node index.js -once
```