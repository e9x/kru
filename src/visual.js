'use strict';

exports.main = (cheat, add) => {
	var three = require('three'),
		v3 = ['x', 'y', 'z'],
		draw_text = (lines, text_x, text_y, font_size) => {
			for(var text_index = 0; text_index < lines.length; text_index++){
				var line = lines[text_index],
					xoffset = 0;
				
				for(var sub_ind = 0; sub_ind < line.length; sub_ind++){
					// if(!line[sub_ind])continue;
					
					var color = line[sub_ind][0],
						text = line[sub_ind][1],
						text_args = [ text, text_x + xoffset, text_y + text_index * (font_size + 2) ];
					
					cheat.ctx.fillStyle = color;
					
					cheat.ctx.strokeText(...text_args);
					cheat.ctx.fillText(...text_args);
					
					xoffset += cheat.ctx.measureText(text).width + 2;
				}
			}
		},
		obj_mat = obj => {
			if(obj.type != 'Mesh' || !obj.dSrc || obj.material[cheat.syms.hooked])return;
			
			obj.material[cheat.syms.hooked] = true;
			
			var otra = obj.material.transparent,
				opac = obj.material.opacity,
				oclr = obj.material.color;
			
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
		},
		ent_visual = ent => {
			// console.log(ent.alias, add(ent).active, add(ent).frustum, add(ent).is_you);
			if(!add(ent).active || !add(ent).frustum || add(ent).is_you)return;
			
			var src_pos = cheat.util.pos2d(cheat, add(ent)),
				src_pos_crouch = cheat.util.pos2d(cheat, add(ent), ent.height - add(ent).crouch * 3),
				esp_width = ~~((src_pos.y - cheat.util.pos2d(cheat, add(ent), ent.height).y) * 0.7),
				esp_height = src_pos.y - src_pos_crouch.y,
				esp_box_y = src_pos.y - esp_height,
				// teammate = green, enemy = red, risk + enemy = orange
				cham_color = add(ent).is_you ? '#FFF' : add(ent).enemy ? add(ent).risk ? '#F70' : '#F00' : '#0F0',
				cham_color_full = parseInt(cham_color.substr(1).split('').map(e => e+e).join(''), 16); // turn #FFF into #FFFFF
			
			if(add(ent).obj)add(ent).obj.traverse(obj => {
				if(obj.type != 'Mesh')return;
				
				obj.material.wireframe = !!cheat.config.game.wireframe;
				
				if(add(ent).is_you || obj[cheat.syms.hooked])return;
				
				obj[cheat.syms.hooked] = true;
				
				var orig_mat = obj.material;
				
				Object.defineProperty(obj, 'material', {
					get: _ => cheat.chams ? new three.MeshBasicMaterial({
						transparent: true,
						fog: false,
						depthTest: false,
						color: add(ent).enemy ? add(ent).risk ? '#F70' : '#F00' : '#0F0',
					}) : orig_mat,
					set: _ => orig_mat = _,
				});
			});
			
			// box ESP
			if(cheat.box){
				cheat.ctx.strokeStyle = cham_color
				cheat.ctx.lineWidth = 1.5;
				cheat.ctx.strokeRect(src_pos.x - esp_width / 2,  esp_box_y, esp_width, esp_height);
			}
			
			// health bar, red - yellow - green gradient
			var hp_perc = (ent.health / add(ent).max_health) * 100;
			
			if(cheat.config.esp.status == 'full' || cheat.config.esp.health_bars){
				var p1 = src_pos.y - esp_height,
					p2 = src_pos.y - esp_height + esp_height;
				
				// work around to non-finite stuff
				if(p1 && p2){
					var hp_grad = cheat.ctx.createLinearGradient(0, p1, 0, p2),
						box_ps = [src_pos.x - esp_width, src_pos.y - esp_height, esp_width / 4, esp_height];
					
					hp_grad.addColorStop(0, '#F00');
					hp_grad.addColorStop(0.5, '#FF0');
					hp_grad.addColorStop(1, '#0F0');
					
					// background of thing
					cheat.ctx.strokeStyle = '#000';
					cheat.ctx.lineWidth = 2;
					cheat.ctx.fillStyle = '#666';
					cheat.ctx.strokeRect(...box_ps);
					
					// inside of it
					cheat.ctx.fillRect(...box_ps);
					
					box_ps[3] = (hp_perc / 100) * esp_height;
					
					// colored part
					cheat.ctx.fillStyle = hp_grad
					cheat.ctx.fillRect(...box_ps);
				}
			}
			
			// full ESP
			cheat.hide_nametags = cheat.config.esp.status == 'full'
			if(cheat.config.esp.status == 'full'){
				// text stuff
				var hp_red = hp_perc < 50 ? 255 : Math.round(510 - 5.10 * hp_perc),
					hp_green = hp_perc < 50 ? Math.round(5.1 * hp_perc) : 255,
					hp_color = '#' + ('000000' + (hp_red * 65536 + hp_green * 256 + 0 * 1).toString(16)).slice(-6),
					player_dist = add(cheat.player).distanceTo(add(ent)),
					font_size = ~~(11 - (player_dist * 0.005));
				
				cheat.ctx.textAlign = 'middle';
				cheat.ctx.font = 'Bold ' + font_size + 'px Tahoma';
				cheat.ctx.strokeStyle = '#000';
				cheat.ctx.lineWidth = 2.5;
				
				draw_text([
					[['#FB8', ent.alias], ['#FFF', ent.clan ? ' [' + ent.clan + ']' : '']],
						[[hp_color, ent.health + '/' + add(ent).max_health + ' HP']],
					// player weapon & ammo
					[['#FFF', ent.weapon.name ],
						['#BBB', '['],
						['#FFF', (ent.weapon.ammo || 'N') + '/' + (ent.weapon.ammo || 'A') ],
						['#BBB', ']']],
					[['#BBB', 'Risk: '], [(add(ent).risk ? '#0F0' : '#F00'), add(ent).risk]],
					[['#BBB', 'Shootable: '], [(add(ent).can_see ? '#0F0' : '#F00'), add(ent).can_see]],
					[['#BBB', '['], ['#FFF', ~~(player_dist / 10) + 'm'], ['#BBB', ']']],
				], src_pos_crouch.x + 12 + (esp_width / 2), src_pos.y - esp_height, font_size);
			}
			
			// tracers
			if(cheat.config.esp.tracers){
				cheat.ctx.strokeStyle = cham_color;
				cheat.ctx.lineWidth = 1.75;
				cheat.ctx.lineCap = 'round';
				
				cheat.ctx.beginPath();
				cheat.ctx.moveTo(cheat.cas.width / 2, cheat.cas.height);
				cheat.ctx.lineTo(src_pos.x, src_pos.y - esp_height / 2);
				cheat.ctx.stroke();
			}
		};

	exports.exec = () => {
		cheat.ctx.clearRect(0, 0, cheat.cas.width, cheat.cas.height);
		
		// draw overlay stuff
		if(cheat.config.game.overlay && cheat.game){
			cheat.ctx.strokeStyle = '#000'
			cheat.ctx.font = 'Bold 14px Inconsolata, monospace';
			cheat.ctx.textAlign = 'start';
			cheat.ctx.lineWidth = 2.6;
			
			var lines = [
				[['#BBB', 'Player: '], ['#FFF', cheat.player ? v3.map(axis => axis + ': ' + add(cheat.player)[axis].toFixed(2)).join(', ') : 'N/A']],
				[['#BBB', 'Target: '], ['#FFF', cheat.target && add(cheat.target).active ? cheat.target.alias + ', ' + v3.map(axis => axis + ': ' + add(cheat.target)[axis].toFixed(2)).join(', ') : 'N/A']],
				[['#BBB', 'Aiming: '], [cheat.player && add(cheat.player).aiming ? '#0F0' : '#F00', cheat.player && add(cheat.player).aiming ? 'TRUE' : 'FALSE']],
				
			];
			
			draw_text(lines, 15, ((cheat.cas.height / 2) - (lines.length * 14)  / 2), 14);
		}
		
		if(!cheat.game || !cheat.controls || !cheat.world || !cheat.player)return;
		
		cheat.world.scene.children.forEach(obj_mat);
		
		cheat.game.players.list.forEach(ent_visual);
	};
};