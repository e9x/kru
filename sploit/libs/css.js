'use strict';

var fs = require('fs'),
	path = require('path'),
	parser = require('css-tree'),
	mimes = {html:'text/html',htm:'text/html',shtml:'text/html',css:'text/css',xml:'text/xml',gif:'image/gif',jpeg:'image/jpeg',jpg:'image/jpeg',js:'application/javascript',atom:'application/atom+xml',rss:'application/rss+xml',mml:'text/mathml',txt:'text/plain',jad:'text/vnd.sun.j2me.app-descriptor',wml:'text/vnd.wap.wml',htc:'text/x-component',png:'image/png',tif:'image/tiff',tiff:'image/tiff',wbmp:'image/vnd.wap.wbmp',ico:'image/x-icon',jng:'image/x-jng',bmp:'image/x-ms-bmp',svg:'image/svg+xml',svgz:'image/svg+xml',webp:'image/webp',woff:'application/font-woff',jar:'application/java-archive',war:'application/java-archive',ear:'application/java-archive',json:'application/json',hqx:'application/mac-binhex40',doc:'application/msword',pdf:'application/pdf',ps:'application/postscript',eps:'application/postscript',ai:'application/postscript',rtf:'application/rtf',m3u8:'application/vnd.apple.mpegurl',xls:'application/vnd.ms-excel',eot:'application/vnd.ms-fontobject',ppt:'application/vnd.ms-powerpoint',wmlc:'application/vnd.wap.wmlc',kml:'application/vnd.google-earth.kml+xml',kmz:'application/vnd.google-earth.kmz','7z':'application/x-7z-compressed',cco:'application/x-cocoa',jardiff:'application/x-java-archive-diff',jnlp:'application/x-java-jnlp-file',run:'application/x-makeself',pl:'application/x-perl',pm:'application/x-perl',prc:'application/x-pilot',pdb:'application/x-pilot',rar:'application/x-rar-compressed',rpm:'application/x-redhat-package-manager',sea:'application/x-sea',swf:'application/x-shockwave-flash',sit:'application/x-stuffit',tcl:'application/x-tcl',tk:'application/x-tcl',der:'application/x-x509-ca-cert',pem:'application/x-x509-ca-cert',crt:'application/x-x509-ca-cert',xpi:'application/x-xpinstall',xhtml:'application/xhtml+xml',xspf:'application/xspf+xml',zip:'application/zip',bin:'application/octet-stream',exe:'application/octet-stream',dll:'application/octet-stream',deb:'application/octet-stream',dmg:'application/octet-stream',iso:'application/octet-stream',img:'application/octet-stream',msi:'application/octet-stream',msp:'application/octet-stream',msm:'application/octet-stream',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',mid:'audio/midi',midi:'audio/midi',kar:'audio/midi',mp3:'audio/mpeg',ogg:'audio/ogg',m4a:'audio/x-m4a',ra:'audio/x-realaudio','3gpp':'video/3gpp','3gp':'video/3gpp',ts:'video/mp2t',mp4:'video/mp4',mpeg:'video/mpeg',mpg:'video/mpeg',mov:'video/quicktime',webm:'video/webm',flv:'video/x-flv',m4v:'video/x-m4v',mng:'video/x-mng',asx:'video/x-ms-asf',asf:'video/x-ms-asf',wmv:'video/x-ms-wmv',avi:'video/x-msvideo',wasm:'application/wasm',ttf:'font/ttf'};

module.exports = source => {
	source += '';
	
	var tree = parser.parse(source),
		read_string = str => {
			if(["'", '"'].includes(str[0])){
				var quote = str[0];
				
				str = [...str.slice(1, -1)].map((char, ind, arr) => char == '\\' && arr[ind + 1] == quote ? null : char).filter(val => val != null).join('');
			}
			
			return str;
		};
	
	parser.walk(tree, node => {
		if(node.type != 'Url' || node.value.type != 'String')return;
		
		var read = read_string(node.value.value);
		
		if(read.startsWith('assets:')){
			var file = path.join(__dirname, read.substr(7)),
				mime = mimes['.' + (path.extname(file) || '').substr(1)] || 'application/octet-stream';
			
			node.value.value = JSON.stringify(`data:${mime};base64,${fs.readFileSync(file, 'base64')}`);
		}
	});
	
	return 'module.exports=' + JSON.stringify(parser.generate(tree));
};