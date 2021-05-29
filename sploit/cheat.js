'use strict';
var API = require('./libs/api'),
	{ api, mm_url, api_url, utils } = require('./consts'),
	vars = require('./libs/vars'),
	Player = require('./libs/player');

exports.hooked = Symbol();
exports.config = {};
exports.skins = [...Array(5000)].map((e, i) => ({ ind: i, cnt: 1 }));
exports.socket_id = 0;

exports.sorts = {
	dist3d(ent_1, ent_2){
		return ent_1.distance_camera - ent_2.distance_camera;
	},
	dist2d(ent_1, ent_2){
		return utils.dist_center(ent_1.rect) - utils.dist_center(ent_2.rect);
	},
	hp(ent_1, ent_2){
		return ent_1.health - ent_2.health;
	},
};

exports.add = entity => new Player(exports, utils, entity);

exports.pick_target = () => exports.game.players.list.map(exports.add).filter(player => player.can_target).sort((ent_1, ent_2) => exports.sorts[exports.config.aim.target_sorting || 'dist2d'](ent_1, ent_2) * (ent_1.frustum ? 1 : 0.5))[0];

var y_offset_types = ['head', 'torso', 'legs'],
	y_offset_rand = 'head';

setInterval(() => y_offset_rand = y_offset_types[~~(Math.random() * y_offset_types.length)], 2000);

Object.defineProperty(exports, 'aim_part', {
	get: _ => exports.config.aim.offset != 'random' ? exports.config.aim.offset : y_offset_rand,
});
