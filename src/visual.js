'use strict';

exports.main = cheat => {
	var UI = require('./libs/ui'),
		constants = require('./consts'),
		v3 = ['x', 'y', 'z'],
		esp_mats = {},
		canvas = UI.canvas,
		ctx = UI.ctx,
		draw_text = (text_x, text_y, font_size, lines) => {
			for(var text_index = 0; text_index < lines.length; text_index++){
				var line = lines[text_index], xoffset = 0;
				
				for(var sub_ind = 0; sub_ind < line.length; sub_ind++){
					var color = line[sub_ind][0],
						text = line[sub_ind][1],
						text_args = [ text, text_x + xoffset, text_y + text_index * (font_size + 2) ];
					
					ctx.fillStyle = color;
					ctx.strokeText(...text_args);
					ctx.fillText(...text_args);
					
					xoffset += ctx.measureText(text).width + 2;
				}
			}
		};
	
	exports.exec = () => {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		// draw overlay
		if(cheat.config.game.overlay){
			ctx.strokeStyle = '#000'
			ctx.font = 'bold 14px inconsolata, monospace';
			ctx.textAlign = 'start';
			ctx.lineWidth = 2.6;
			
			var lines = [
				[['#BBB', 'Player: '], ['#FFF', cheat.player && cheat.player.active ? v3.map(axis => axis + ': ' + cheat.player[axis].toFixed(2)).join(', ') : 'N/A']],
				[['#BBB', 'Target: '], ['#FFF', cheat.target && cheat.target.active ? cheat.target.alias + ', ' + v3.map(axis => axis + ': ' + cheat.target[axis].toFixed(2)).join(', ') : 'N/A']],
			];
			
			draw_text(15, ((canvas.height / 2) - (lines.length * 14)  / 2), 14, lines);
		}
		
		// aim fov
		if(cheat.config.aim.fov_box){
			var width = (canvas.width * cheat.config.aim.fov) / 100,
				height = (canvas.height * cheat.config.aim.fov) / 100;
			
			ctx.fillStyle = '#F00';
			ctx.globalAlpha = 0.4;
			ctx.fillRect((canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
			ctx.globalAlpha = 1;
		}
		
		if(!cheat.game || !cheat.world)return;
		
		cheat.world.scene.children.forEach(obj => {
			if(obj.type != 'Mesh' || !obj.dSrc || obj.material[cheat.syms.hooked])return;
			
			obj.material[cheat.syms.hooked] = true;
			
			var otra = obj.material.transparent,
				opac = obj.material.opacity;
			
			Object.defineProperties(obj.material, {
				opacity: {
					get: _ => cheat.config.esp.walls.status ? opac * cheat.config.esp.walls.value : opac,
					set: _ => opac = _,
				},
				transparent: {
					get: _ => cheat.config.esp.walls.status ? true : otra,
					set: _ => otra = _,
				},
			});
		});
		
		for(var ent of cheat.game.players.list){
			let player = cheat.add(ent);
			
			if(!player.active || !player.frustum || player.is_you)continue;
			
			if(player.obj){
				if(!player.obj[cheat.syms.hooked]){
					player.obj[cheat.syms.hooked] = true;
					
					let visible = true;
					
					Object.defineProperty(player.obj, 'visible', {
						get: _ => cheat.draw_chams || visible,
						set: _ => visible = _,
					});
				}
				
				player.obj.traverse(obj => {
					if(obj.type != 'Mesh')return;
					
					obj.material.wireframe = !!cheat.config.game.wireframe;
					
					if(player.is_you || obj[cheat.syms.hooked])return;
					
					obj[cheat.syms.hooked] = true;
					
					var orig_mat = obj.material;
					
					Object.defineProperty(obj, 'material', {
						get: _ => cheat.draw_chams ? (esp_mats[player.esp_color] || (esp_mats[player.esp_color] = new cheat.three.MeshBasicMaterial({
							transparent: true,
							fog: false,
							depthTest: false,
							color: player.esp_color,
						}))) : orig_mat,
						set: _ => orig_mat = _,
					});
				});
			}
			
			let rect = player.rect();
			
			// box ESP
			if(cheat.draw_box){
				ctx.strokeStyle = player.esp_color;
				ctx.lineWidth = 1.5;
				ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);
			}
			
			// health bar, red - yellow - green gradient
			var hp_perc = (player.health / player.max_health) * 100;
			
			if(cheat.config.esp.status == 'full' || cheat.config.esp.health_bars){
				var box_ps = [ rect.left - rect.width / 2, rect.top, rect.width / 4, rect.height ],
					hp_grad;
				
				try{
					hp_grad = ctx.createLinearGradient(0, box_ps[1], 0, box_ps[1] + box_ps[3]);
					
					hp_grad.addColorStop(0, '#F00');
					hp_grad.addColorStop(0.5, '#FF0');
					hp_grad.addColorStop(1, '#0F0');
					
					// border
					ctx.strokeStyle = '#000';
					ctx.lineWidth = 2;
					ctx.fillStyle = '#666';
					ctx.strokeRect(...box_ps);
					
					// inside of it
					ctx.fillRect(...box_ps);
					
					box_ps[3] *= hp_perc / 100;
					
					// colored part
					ctx.fillStyle = hp_grad;
					ctx.fillRect(...box_ps);
				}catch(err){
					console.log(box_ps);
				}
			}
			
			// full ESP
			if(cheat.config.esp.status == 'full'){
				// text stuff
				var hp_red = hp_perc < 50 ? 255 : Math.round(510 - 5.10 * hp_perc),
					hp_green = hp_perc < 50 ? Math.round(5.1 * hp_perc) : 255,
					hp_color = '#' + ('000000' + (hp_red * 65536 + hp_green * 256 + 0 * 1).toString(16)).slice(-6),
					font_size = ~~(11 - (player.distance_camera() * 0.005));
				
				ctx.textAlign = 'middle';
				ctx.font = 'Bold ' + font_size + 'px Tahoma';
				ctx.strokeStyle = '#000';
				ctx.lineWidth = 2.5;
				
				draw_text(rect.right + (rect.width / 2), rect.top, font_size, [
					[['#FB8', player.alias], ['#FFF', player.clan ? ' [' + player.clan + ']' : '']],
						[[hp_color, player.health + '/' + player.max_health + ' HP']],
					// player weapon & ammo
					[['#FFF', player.weapon.name ],
						['#BBB', '['],
						['#FFF', (player.weapon.ammo || 'N') + '/' + (player.weapon.ammo || 'A') ],
						['#BBB', ']']],
					[['#BBB', 'Risk: '], [(player.risk ? '#0F0' : '#F00'), player.risk ? 'Yes' : 'No']],
				]);
			}
			
			// tracers
			if(cheat.config.esp.tracers){
				ctx.strokeStyle = player.esp_color;
				ctx.lineWidth = 1.75;
				ctx.lineCap = 'round';
				
				ctx.beginPath();
				// bottom center
				ctx.moveTo(canvas.width / 2, canvas.height);
				// target center
				ctx.lineTo(rect.x, rect.y);
				ctx.stroke();
			}
		}
	};
};