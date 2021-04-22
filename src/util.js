exports.pi2 = Math.PI * 2;
exports.halfpi = Math.PI / 2;

exports.normal_radian = radian => { 
	radian = radian % exports.pi2;
	
	if(radian < 0)radian += exports.pi2;
				
	return radian;
};

exports.frustum = (frustum, point) => {
	for(var ind = 0; ind < 6; ind++)if(frustum.planes[ind].distanceToPoint(point) < 0)return false;
	
	return true;
};

exports.distanceTo = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);

exports.applyMatrix4 = (pos, t) => {
	var e=pos.x,n=pos.y,r=pos.z,i=t.elements,a=1/(i[3]*e+i[7]*n+i[11]*r+i[15]);
	return pos.x=(i[0]*e+i[4]*n+i[8]*r+i[12])*a,pos.y=(i[1]*e+i[5]*n+i[9]*r+i[13])*a,pos.z=(i[2]*e+i[6]*n+i[10]*r+i[14])*a,pos
};

exports.project3d = (pos, t) => exports.applyMatrix4(exports.applyMatrix4(pos, t.matrixWorldInverse), t.projectionMatrix);

exports.pos2d = (pos, aY = 0) => {
	if(isNaN(pos.x) || isNaN(pos.y) || isNaN(pos.z))return { x: 0, y: 0 };
	
	if(!exports.cas)exports.cas = parent.document.querySelector('#game-overlay');
	
	pos = Object.assign({}, pos);
	
	pos.y += aY;
	
	exports.cheat.world.camera.updateMatrix();
	exports.cheat.world.camera.updateMatrixWorld();
	
	exports.project3d(pos, exports.cheat.world.camera);
	
	return {
		x: (pos.x + 1) / 2 * exports.cas.width,
		y: (-pos.y + 1) / 2 * exports.cas.height,
	}
};

exports.can_see = (player, target, offset = 0) => {
	if(!player)return false;
	
	var d3d = exports.getD3D(player.x, player.y, player.z, target.x, target.y, target.z),
		dir = exports.getDir(player.z, player.x, target.z, target.x),
		dist_dir = exports.getDir(exports.getDistance(player.x, player.z, target.x, target.z), target.y, 0, player.y),
		ad = 1 / (d3d * Math.sin(dir - Math.PI) * Math.cos(dist_dir)),
		ae = 1 / (d3d * Math.cos(dir - Math.PI) * Math.cos(dist_dir)),
		af = 1 / (d3d * Math.sin(dist_dir)),
		height = player.y + (player.height || 0) - 1.15, // 1.15 = config.cameraHeight
		obj;
	
	// iterate through game objects
	for(var ind in exports.cheat.game.map.manager.objects){
		obj = exports.cheat.game.map.manager.objects[ind];
		
		if(!obj.noShoot && obj.active && (exports.cheat.player.weapon && exports.cheat.player.weapon.pierce && exports.cheat.config.aim.wallbangs ? !obj.penetrable : true)){	

			var in_rect = exports.lineInRect(player.x, player.z, height, ad, ae, af, obj.x - Math.max(0, obj.width - offset), obj.z - Math.max(0, obj.length - offset), obj.y - Math.max(0, obj.height - offset), obj.x + Math.max(0, obj.width - offset), obj.z + Math.max(0, obj.length - offset), obj.y + Math.max(0, obj.height - offset));
			
			if(in_rect && 1 > in_rect)return in_rect;
		}
	}
	
	// iterate through game terrain
	if(exports.cheat.game.map.terrain){
		var al = exports.cheat.game.map.terrain.raycast(player.x, -player.z, height, 1 / ad, -1 / ae, 1 / af);
		if(al)return exports.getD3D(player.x, player.y, player.z, al.x, al.z, -al.y);
	}
};

exports.getDistance = (x1, y1, x2, y2) => {
	return Math.sqrt((x2 -= x1) * x2 + (y2 -= y1) * y2);
};

exports.getD3D = (x1, y1, z1, x2, y2, z2) => {
	var dx = x1 - x2,
		dy = y1 - y2,
		dz = z1 - z2;
	
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
},
exports.getXDire = (x1, y1, z1, x2, y2, z2) => Math.asin(Math.abs(y1 - y2) / exports.getD3D(x1, y1, z1, x2, y2, z2)) * ((y1 > y2) ? -1 : 1),
exports.getDir = (x1, y1, x2, y2) => Math.atan2(y1 - y2, x1 - x2);

exports.lineInRect = (lx1, lz1, ly1, dx, dz, dy, x1, z1, y1, x2, z2, y2) => {
	var t1 = (x1 - lx1) * dx,
		t2 = (x2 - lx1) * dx,
		t3 = (y1 - ly1) * dy,
		t4 = (y2 - ly1) * dy,
		t5 = (z1 - lz1) * dz,
		t6 = (z2 - lz1) * dz,
		tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6)),
		tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));
	
	return (tmax < 0 || tmin > tmax) ? false : tmin;
};

exports.getAngleDst = (a1, a2) => Math.atan2(Math.sin(a2 - a1), Math.cos(a1 - a2));