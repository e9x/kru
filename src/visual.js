'use strict';

exports.main = (cheat, add) => {
	var materials = {},
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
			if(!add(ent).active || !add(ent).frustum || add(ent).is_you)return;
			
			var src_pos = cheat.util.pos2d(add(ent)),
				src_pos_crouch = cheat.util.pos2d(add(ent), ent.height - add(ent).crouch * 3),
				esp_width = ~~((src_pos.y - cheat.util.pos2d(add(ent), ent.height).y) * 0.7),
				esp_height = src_pos.y - src_pos_crouch.y,
				esp_box_y = src_pos.y - esp_height,
				// teammate = green, enemy = red, risk + enemy = orange
				cham_color = add(ent).is_you ? '#FFF' : add(ent).enemy ? add(ent).risk ? '#F70' : '#F00' : '#0F0',
				cham_color_full = parseInt(cham_color.substr(1).split('').map(e => e+e).join(''), 16), // turn #FFF into #FFFFFF
				chams_enabled = cheat.config.esp.status == 'chams' || cheat.config.esp.status == 'box_chams' || cheat.config.esp.status == 'full';
			
			if(add(ent).obj)add(ent).obj.traverse(obj => {
				if(obj.type != 'Mesh')return;
				
				obj.material.wireframe = !!cheat.config.game.wireframe;
				
				if(add(ent).is_you || obj[cheat.syms.hooked])return;
				
				obj[cheat.syms.hooked] = true;
				
				var orig_mat = obj.material;
				
				Object.defineProperty(obj, 'material', {
					get: _ => {
						var color = add(ent).enemy ? add(ent).risk ? '#F70' : '#F00' : '#0F0';
						
						return cheat.config.esp.status == 'chams' || cheat.config.esp.status == 'box_chams' || cheat.config.esp.status == 'full'
						? (materials[color] || (materials[color] = new cheat.three.MeshBasicMaterial({
							transparent: true,
							fog: false,
							depthTest: false,
							color: color,
						}))) : orig_mat;
					},
					set: _ => orig_mat = _,
				});
			});
			
			// box ESP
			if(cheat.config.esp.status == 'box' || cheat.config.esp.status == 'box_chams' || cheat.config.esp.status == 'full'){
				cheat.ctx.strokeStyle = cham_color
				cheat.ctx.lineWidth = 1.5;
				cheat.ctr('strokeRect', [ src_pos.x - esp_width / 2,  esp_box_y, esp_width, esp_height ]);
			}
			
			// health bar, red - yellow - green gradient
			var hp_perc = (ent.health / add(ent).max_health) * 100;
			
			if(cheat.config.esp.status == 'full' || cheat.config.esp.health_bars){
				var p1 = src_pos.y - esp_height,
					p2 = src_pos.y - esp_height + esp_height;
				
				// work around to non-finite stuff
				if(p1 && p2){
					var hp_grad = cheat.ctr('createLinearGradient', [0, p1, 0, p2 ]),
						box_ps = [src_pos.x - esp_width, src_pos.y - esp_height, esp_width / 4, esp_height];
					
					hp_grad.addColorStop(0, '#F00');
					hp_grad.addColorStop(0.5, '#FF0');
					hp_grad.addColorStop(1, '#0F0');
					
					// background of thing
					cheat.ctx.strokeStyle = '#000';
					cheat.ctx.lineWidth = 2;
					cheat.ctx.fillStyle = '#666';
					cheat.ctr('strokeRect', box_ps);
					
					// inside of it
					cheat.ctr('fillRect', box_ps);
					
					box_ps[3] = (hp_perc / 100) * esp_height;
					
					// colored part
					cheat.ctx.fillStyle = hp_grad
					cheat.ctr('fillRect', box_ps);
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
				
				cheat.draw_text([
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
				
				cheat.ctr('beginPath');
				cheat.ctr('moveTo', [cheat.cas.width / 2, cheat.cas.height]);
				cheat.ctr('lineTo', [src_pos.x, src_pos.y - esp_height / 2]);
				cheat.ctr('stroke');
			}
		};

	exports.exec = () => {
		if(!cheat.cas || !cheat.ctx){
			cheat.cas = parent.document.querySelector('#game-overlay');
			cheat.ctx = cheat.cas ? cheat.cas.getContext('2d', { alpha: true }) : {};
		}
		
		cheat.ctr('resetTransform');
		
		if(cheat.config.esp.minimap){
			var cm = cheat.game.map.maps[cheat.game.map.lastGen];
			
			if(!cm)return;
			
			if(!cm.mm || !cm.dims){
				cm.mm = {
					scale: 6,
					offset: {
						x: 100,
						y: 75,
					},
					player_size: {
						w: 5,
						h: 5
					},
				};
				
				cm.objs = cm.objects.map(obj => console.log(obj) + ({ collision: !(obj.l || obj.col), pos: { x: obj.p[0], y: obj.p[1], z: obj.p[2] }, size: { x: obj.s[0], y: obj.s[1], z: obj.s[2] }, color: obj.c, opacity: obj.o == null ? 1 : obj.o  })).filter(obj =>
					obj.collision &&
					obj.opacity &&
					obj.color &&
					obj.size.x &&
					obj.size.y && 
					obj.size.z &&
					obj.size.x < 100 &&
					obj.pos.y);
				
				cm.dims = { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
				
				cm.objs.forEach(obj => {
					cm.dims.min.x = obj.pos.x < cm.dims.min.x ? obj.pos.x : cm.dims.min.x;
					cm.dims.max.x = obj.pos.x > cm.dims.min.x ? obj.pos.x : cm.dims.min.x;
					
					cm.dims.min.z = obj.pos.z < cm.dims.min.z ? obj.pos.z : cm.dims.min.z;
					cm.dims.max.z = obj.pos.z > cm.dims.min.z ? obj.pos.z : cm.dims.min.z;
				});
				
				cm.dims.size = {
					w: Math.abs(cm.dims.min.x) + Math.abs(cm.dims.max.x),
					h: Math.abs(cm.dims.min.z) + Math.abs(cm.dims.max.z),
				};
				
				cm.dims.min.x_abs = Math.abs(cm.dims.min.x);
				cm.dims.min.z_abs = Math.abs(cm.dims.min.z);
				
				cm.objs = cm.objs.sort((pobj, obj) => (pobj.pos.y + pobj.size.y) - (obj.pos.y + obj.size.y));
				
				cm.obj_calc = cm.objs.map(obj => {
					var cth = c => ((~~c).toString(16) + '').padStart(2, '0'),
						htc = h => {
							var [r, g, b] = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h).slice(1).map(n => parseInt(n, 16));
							
							return { r: r, g: g, b: b };
						},
						color = htc(obj.color.length == 4 ? '#' + obj.color.substr(1).split('').map(e => e+e).join('') : obj.color),
						inc = (obj.pos.y + obj.size.y) / 3;
					
					return [
						'#' + cth(color.r - inc) + cth(color.g - inc) + cth(color.b - inc),
						[
							~~(cm.mm.offset.x + ((cm.dims.min.x_abs + obj.pos.x) / cm.mm.scale)),
							~~(cm.mm.offset.y + ((cm.dims.min.z_abs + obj.pos.z) / cm.mm.scale)),
							~~(obj.size.x / cm.mm.scale),
							~~(obj.size.z / cm.mm.scale)
						],
					];
				});
			};
			
			cm.obj_calc.forEach(calculated => (cheat.ctx.fillStyle = calculated[0], cheat.ctr('fillRect', calculated[1])));
			
			cheat.game.players.list.filter(ent => add(ent).active).forEach(ent => {
				var wp = cm.dims.min.x_abs + add(ent).x,
					hp = cm.dims.min.z_abs + add(ent).z,
					cham_color = add(ent).is_you ? '#FFF' : (add(ent).enemy ? add(ent).risk ? '#F70' : '#F00' : '#0F0');
				
				cheat.ctx.fillStyle = cheat.ctx.strokeStyle = cham_color;
				
				cheat.ctr('beginPath');
				cheat.ctr('arc', [ cm.mm.offset.x + (wp / cm.mm.scale), cm.mm.offset.y + (hp / cm.mm.scale), 3, 0, 2 * Math.PI ]);
				cheat.ctr('fill');
				
				if(add(ent).is_you){
					cheat.ctr('beginPath');
					cheat.ctr('moveTo', [ cm.mm.offset.x + (wp / cm.mm.scale), cm.mm.offset.y + (hp / cm.mm.scale) ]);
					
					var qx = add(ent).obj.quaternion.x,
						qy = add(ent).obj.quaternion.y,
						qz = add(ent).obj.quaternion.z,
						qw = add(ent).obj.quaternion.w,
						ix = qw * 0 + qy * 1 - qz * 0,
						iy = qw * 0 + qz * 0 - qx * 1,
						iz = qw * 1 + qx * 0 - qy * 0,
						iw = -qx * 0 - qy * 0 - qz * 1,
						nwp = cm.dims.min.x_abs + add(ent).x + (ix * qw + iw * -qx + iy * -qz - iz * -qy) * -250,
						nhp = cm.dims.min.z_abs + add(ent).z + (iz * qw + iw * -qz + ix * -qy - iy * -qx) * -250;
					
					cheat.ctx.strokeStyle = cham_color;
					cheat.ctx.lineWidth = 1.75;
					cheat.ctx.lineCap = 'round';
					
					cheat.ctr('lineTo', [ cm.mm.offset.x + (nwp / cm.mm.scale) - cm.mm.player_size.w / 2, cm.mm.offset.y + (nhp / cm.mm.scale) - cm.mm.player_size.h / 2 ]);
					cheat.ctr('stroke');
				}
			});
		}
		
		// draw overlay stuff
		if(cheat.config.game.overlay && cheat.game && cheat.ctx){
			cheat.ctx.strokeStyle = '#000'
			cheat.ctx.font = 'Bold 14px Inconsolata, monospace';
			cheat.ctx.textAlign = 'start';
			cheat.ctx.lineWidth = 2.6;
			
			var lines = [
				[['#BBB', 'Player: '], ['#FFF', cheat.player && add(cheat.player) ? cheat.v3.map(axis => axis + ': ' + add(cheat.player)[axis].toFixed(2)).join(', ') : 'N/A']],
				[['#BBB', 'Target: '], ['#FFF', cheat.target && cheat.target[add] && add(cheat.target).active ? cheat.target.alias + ', ' + cheat.v3.map(axis => axis + ': ' + add(cheat.target)[axis].toFixed(2)).join(', ') : 'N/A']],
				[['#BBB', 'Aiming: '], [cheat.player && add(cheat.player) && add(cheat.player).aiming ? '#0F0' : '#F00', cheat.player && add(cheat.player) && add(cheat.player).aiming ? 'TRUE' : 'FALSE']],
				
			];
			
			cheat.draw_text(lines, 15, ((cheat.cas.height / 2) - (lines.length * 14)  / 2), 14);
		}
		
		if(!cheat.game || !cheat.controls || !cheat.world || !cheat.player)return;
		
		cheat.world.scene.children.forEach(obj_mat);
		
		cheat.game.players.list.forEach(ent_visual);
	};
};