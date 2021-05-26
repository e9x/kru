'use strict';

var cheat = require('./cheat'),
	UI = require('./libs/ui/'),
	{ utils } = require('./consts'),
	v3 = ['x', 'y', 'z'],
	esp_mats = {};

class Visual {
	tick(){
		this.canvas = UI.canvas;
		this.ctx = UI.ctx;
		
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}
	draw_text(text_x, text_y, font_size, lines){
		for(var text_index = 0; text_index < lines.length; text_index++){
			var line = lines[text_index], xoffset = 0;
			
			for(var sub_ind = 0; sub_ind < line.length; sub_ind++){
				var color = line[sub_ind][0],
					text = line[sub_ind][1],
					text_args = [ text, text_x + xoffset, text_y + text_index * (font_size + 2) ];
				
				this.ctx.fillStyle = color;
				this.ctx.strokeText(...text_args);
				this.ctx.fillText(...text_args);
				
				xoffset += this.ctx.measureText(text).width + 2;
			}
		}
	}
	fov(fov){
		var width = (this.canvas.width * fov) / 100,
			height = (this.canvas.height * fov) / 100;
		
		this.ctx.fillStyle = '#F00';
		this.ctx.globalAlpha = 0.4;
		this.ctx.fillRect((this.canvas.width - width) / 2, (this.canvas.height - height) / 2, width, height);
		this.ctx.globalAlpha = 1;
	}
	walls(){
		cheat.world.scene.children.forEach(obj => {
			if(obj.type != 'Mesh' || !obj.dSrc || obj.material[Visual.hooked])return;
			
			obj.material[Visual.hooked] = true;
			
			var otra = obj.material.transparent,
				opac = obj.material.opacity;
			
			Object.defineProperties(obj.material, {
				opacity: {
					get: _ => opac * cheat.config.esp.walls / 100,
					set: _ => opac = _,
				},
				transparent: {
					get: _ => cheat.config.esp.walls != 100 ? true : otra,
					set: _ => otra = _,
				},
			});
		});
	}
	overlay(){
		this.ctx.strokeStyle = '#000'
		this.ctx.font = 'bold 14px inconsolata, monospace';
		this.ctx.textAlign = 'start';
		this.ctx.lineWidth = 2.6;
		
		var lines = [
			[['#BBB', 'Player: '], ['#FFF', cheat.player && cheat.player.active ? v3.map(axis => axis + ': ' + cheat.player[axis].toFixed(2)).join(', ') : 'N/A']],
			[['#BBB', 'Target: '], ['#FFF', cheat.target && cheat.target.active ? cheat.target.alias + ', ' + v3.map(axis => axis + ': ' + cheat.target[axis].toFixed(2)).join(', ') : 'N/A']],
		];
		
		this.draw_text(15, ((this.canvas.height / 2) - (lines.length * 14)  / 2), 14, lines);
	}
	box(player){
		this.ctx.strokeStyle = player.esp_color;
		this.ctx.lineWidth = 1.5;
		
		/*this.ctx.beginPath();
		this.ctx.moveTo(player.bounds.min.x, player.bounds.min.y);
		this.ctx.lineTo(player.bounds.min.x, player.bounds.max.y);
		this.ctx.lineTo(player.bounds.max.x, player.bounds.max.y);
		this.ctx.lineTo(player.bounds.max.x, player.bounds.min.y);
		this.ctx.lineTo(player.bounds.min.x, player.bounds.min.y);
		this.ctx.stroke();*/
		this.ctx.strokeRect(player.rect.left, player.rect.top, player.rect.width, player.rect.height);
	}
	tracer(player){
		this.ctx.strokeStyle = player.esp_color;
		this.ctx.lineWidth = 1.75;
		this.ctx.lineCap = 'round';
		
		this.ctx.beginPath();
		// bottom center
		this.ctx.moveTo(this.canvas.width / 2, this.canvas.height);
		// target center
		this.ctx.lineTo(player.rect.x, player.rect.bottom);
		this.ctx.stroke();
	}
	get can_draw_chams(){
		return cheat.config.esp.status == 'chams' || cheat.config.esp.status == 'box_chams' || cheat.config.esp.status == 'full';
	}
	cham(player){
		var self = this;
		
		if(!player.obj[Visual.hooked]){
			player.obj[Visual.hooked] = true;
			
			let visible = true;
			
			Object.defineProperty(player.obj, 'visible', {
				get: _ => this.can_draw_chams || visible,
				set: _ => visible = _,
			});
		}
		
		player.obj.traverse(obj => {
			if(obj.type != 'Mesh' || obj[Visual.hooked])return;
			
			obj[Visual.hooked] = true;
			
			var orig_mat = obj.material;
			
			Object.defineProperty(obj, 'material', {
				get(){
					var material = self.can_draw_chams ? (esp_mats[player.esp_color] || (esp_mats[player.esp_color] = new cheat.three.MeshBasicMaterial({
						transparent: true,
						fog: false,
						depthTest: false,
						color: player.esp_color,
					}))) : orig_mat;
					
					material.wireframe = !!cheat.config.game.wireframe;
					
					return material;
				},
				set: _ => orig_mat = _,
			});
		});
	}
	label(player){
		for(var part in player.parts){
			var srcp = utils.pos2d(player.parts[part]);
			this.ctx.fillStyle = '#FFF';
			this.ctx.font = '13px monospace thin';
			this.ctx.fillRect(srcp.x - 2, srcp.y - 2, 4, 4);
			this.ctx.fillText(part, srcp.x, srcp.y - 6);
		}
	}
	health(player){
		var width = player.rect.height / 5,
			box_ps = [ player.rect.left - width, player.rect.top, width, player.rect.height ];
		
		// broken ps looks like [NaN, NaN, 0, NaN]
		if(box_ps.every(num => !isNaN(num))){
			var hp_grad = this.ctx.createLinearGradient(0, box_ps[1], 0, box_ps[1] + box_ps[3]);
			
			hp_grad.addColorStop(0, '#F00');
			hp_grad.addColorStop(0.5, '#FF0');
			hp_grad.addColorStop(1, '#0F0');
			
			// border
			this.ctx.strokeStyle = '#000';
			this.ctx.lineWidth = 2;
			this.ctx.fillStyle = '#666';
			this.ctx.strokeRect(...box_ps);
			
			// inside of it
			this.ctx.fillRect(...box_ps);
			
			box_ps[3] *= (player.health / player.max_health);
			
			// colored part
			this.ctx.fillStyle = hp_grad;
			this.ctx.fillRect(...box_ps);
		}
	}
	text(player){
		this.ctx.save();
		this.ctx.scale(player.scale, player.scale);
		
		this.ctx.textAlign = 'middle';
		this.ctx.font = 'Bold 11px Tahoma';
		this.ctx.strokeStyle = '#000';
		this.ctx.lineWidth = 2.5;

		this.draw_text(player.srect.right + 5, player.srect.top + 8, 11, [
			[
				[ '#FB8', player.alias ],
				[ '#FFF', player.clan ? ' [' + player.clan + ']' : '' ],
			],
			[
				[ player.hp_color, player.health + '/' + player.max_health + ' HP' ],
			],
			[
				[ '#FFF', player.weapon.name ],
				[ '#BBB', '[' ],
				[ '#FFF', (player.weapon.ammo || 'N') + '/' + (player.weapon.ammo || 'A') ],
				[ '#BBB', ']' ],
			],
			[
				[ '#BBB', 'Risk: ' ],
				[ player.risk ? '#0F0' : '#F00', player.risk ? 'Yes' : 'No' ],
			],
		]);
		
		this.ctx.restore();
	}
};

Visual.hooked = Symbol();

module.exports = Visual;