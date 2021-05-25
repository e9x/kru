'use strict';
var API = require('./libs/api'),
	{ mm_url, api_url, utils } = require('./consts'),
	api = new API(mm_url, api_url),
	vars = require('./libs/vars'),
	Player = require('./libs/player'),
	visual = require('./visual');

exports.hooked = Symbol();
exports.config = {};
exports.skins = [...Array(5000)].map((e, i) => ({ ind: i, cnt: 1 }));
exports.socket_id = 0;

exports.sorts = {
	dist3d(ent_1, ent_2){
		return ent_1.distance_camera() - ent_2.distance_camera();
	},
	dist2d(ent_1, ent_2){
		return utils.dist_center(ent_1.rect()) - utils.dist_center(ent_2.rect());
	},
	hp(ent_1, ent_2){
		return ent_1.health - ent_2.health;
	},
};

exports.add = entity => new Player(exports, utils, entity);

exports.pick_target = () => exports.game.players.list.map(exports.add).filter(player => player.can_target).sort((ent_1, ent_2) => exports.sorts[exports.config.aim.target_sorting || 'dist2d'](ent_1, ent_2) * (ent_1.frustum ? 1 : 0.5))[0];

exports.draw_box = () => exports.config.esp.status == 'box' || exports.config.esp.status == 'box_chams' || exports.config.esp.status == 'full';

exports.draw_chams = () => exports.config.esp.status == 'chams' || exports.config.esp.status == 'box_chams' || exports.config.esp.status == 'full';

exports.update_frustum = () => exports.world.frustum.setFromProjectionMatrix(new exports.three.Matrix4().multiplyMatrices(exports.world.camera.projectionMatrix, exports.world.camera.matrixWorldInverse));

exports.process = () => {
	try{
		if(exports.game && exports.world){
			for(var ent of exports.game.players.list){
				let player = exports.add(ent);
				
				if(!player.active)continue;
				
				if(player.is_you)exports.player = player;
				
				player.tick();
			}
		};
		
		visual();
	}catch(err){
		api.report_error('frame', err);
	}
	
	requestAnimationFrame(exports.process);
};

exports.camera_world = () => {
	var matrix_copy = exports.world.camera.matrixWorld.clone(),
		pos = exports.world.camera[vars.getWorldPosition]();
	
	exports.world.camera.matrixWorld.copy(matrix_copy);
	exports.world.camera.matrixWorldInverse.copy(matrix_copy).invert();
	
	return pos.clone();
};

exports.contains_point = point => {
	for(var ind = 0; ind < 6; ind++)if(exports.world.frustum.planes[ind].distanceToPoint(point) < 0)return false;
	return true;
};