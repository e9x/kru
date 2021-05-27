'use strict';

/*
Source: https://api.sys32.dev/v1/source

Notes:
	- Versions around 3.9.2 don't have variable randomization
	- Keep regexes updated
*/

var vars = new Map(),
	patches = new Map(),
	add_var = (varn, regex, index) => vars.set(varn, [ regex, index ]),
	add_patch = (regex, replacement) => patches.set(regex, replacement),
	key = '_' + Math.random().toString().substr(2);

add_var('procInputs', /this\.(\w+)=function\(\w+,\w+,\w+,\w+\){this\.recon/, 1);

add_var('isYou', /this\.accid=0,this\.(\w+)=\w+,this\.isPlayer/, 1);

add_var('pchObjc', /0,this\.(\w+)=new \w+\.Object3D,this/, 1);

add_var('aimVal', /this\.(\w+)-=1\/\(this\.weapon\.aimSpd/, 1),

add_var('crouchVal', /this\.(\w+)\+=\w\.crouchSpd\*\w+,1<=this\.\w+/, 1),

add_var('didShoot', /--,\w+\.(\w+)=!0/, 1);

add_var('ammos', /length;for\(\w+=0;\w+<\w+\.(\w+)\.length/, 1);

add_var('weaponIndex', /\.weaponConfig\[\w+]\.secondary&&\(\w+\.(\w+)==\w+/, 1);

add_var('maxHealth', /\.regenDelay,this\.(\w+)=\w+\.mode&&\w+\.mode\.\1/, 1),

add_var('yVel', /\w+\.(\w+)&&\(\w+\.y\+=\w+\.\1\*/, 1);

add_var('mouseDownR', /this\.(\w+)=0,this\.keys=/, 1);

add_var('recoilAnimY', /\.\w+=0,this\.(\w+)=0,this\.\w+=0,this\.\w+=1,this\.slide/, 1),

add_var('objInstances', /lowerBody\),\w+\|\|\w+\.(\w+)\./, 1),

add_var('getWorldPosition', /var \w+=\w+\.camera\.(\w+)\(\);/, 1);

// Nametags
add_patch(/(&&)((\w+)\.cnBSeen)(?=\){if\(\(\w+=\3\.objInstances)/, (match, start, can_see) => start + key + '.can_see(' + can_see + ')');

// Game
add_patch(/(\w+)\.moveObj=func/, (match, game) => key + '.game(' + game + '),' + match);

// World
add_patch(/(\w+)\.backgroundScene=/, (match, world) => key + '.world(' + world + '),' + match);

// ThreeJS
add_patch(/\(\w+,(\w+),\w+\){(?=[a-z ';\.\(\),]+ACESFilmic)/, (match, three) => match + key + '.three(' + three + ');');

// Skins
add_patch(/((?:[a-zA-Z]+(?:\.|(?=\.skins)))+)\.skins(?!=)/g, (match, player) => key + '.skins(' + player + ')');

// Socket
add_patch(/(\w+)(\.exports={ahNum:)/, (match, mod, other) => '({set exports(socket){' + key + '.socket(socket);return ' + mod + '.exports=socket}})' + other);

// Input
//add_patch(/((\w+\.\w+)\[\2\._push\?'_push':'push']\()(\w+)(\),)/, (match, func, array, input, end) => func + key + '.input(' + input + ')' + end);

exports.patch = source => {
	var found = {},
		missing = {};
	
	for(var [ label, [ regex, index ] ] of vars){
		var value = (source.match(regex) || 0)[index];
		
		if(value)exports[label] = found[label] = value;
		else missing[label] = [ regex, index ];
	}
	
	console.log('Found:');
	console.table(found);
	
	console.log('Missing:');
	console.table(missing);
	
	for(var [ input, replacement ] of patches)source = source.replace(input, replacement);
	
	return source;
};

exports.key = key;