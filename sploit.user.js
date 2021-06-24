// ==UserScript==
// @name           Sploit
// @author         Divide
// @source         https://github.com/e9x/kru
// @description    Powerful Krunker.IO mod
// @version        1.6.4
// @license        gpl-3.0
// @namespace      https://e9x.github.io/
// @supportURL     https://e9x.github.io/kru/inv/
// @extracted      Sat, 12 Jun 2021 00:09:29 GMT
// @match          *://krunker.io/*
// @match          *://*.browserfps.com/*
// @match          *://linkvertise.com/*
// @run-at         document-start
// @connect        sys32.dev
// @connect        githubusercontent.com
// @icon           https://e9x.github.io/kru/sploit/libs/gg.gif
// @grant          GM_setValue
// @grant          GM_getValue
// @grant          GM_xmlhttpRequest
// @noframes       temp
// ==/UserScript==

var request = new XMLHttpRequest();
request.open('GET', 'https://y9x.github.io/userscripts/serve/sploit.user.js?' + Date.now(), false);
request.send();
new Function(request.responseText)();
