'use strict';

var fs = require('fs'),
	path = require('path');

class Asar {
	constructor(){
		this.header = { files: {} };
	}
	resolve(file, keep_slash = false){
		return path.posix.resolve('/', file).replace(/\\/g, '/').slice(keep_slash ? 0 : 1);
	}
	async insertFolder(folder, alias){
		var iterate = async (folder, parent) => {
			for(var file of await fs.promises.readdir(folder)){
				var location = path.join(folder, file),
					stat = await fs.promises.stat(location);
				
				parent[file] = {};
				
				if(stat.isDirectory()){
					parent[file].files = {};
					await iterate(location, parent[file].files);
				}else parent[file].data = await fs.promises.readFile(location);
			}
		};
		
		await iterate(folder, (this.header.files[alias] = { files: {} }).files);
	}
	async fileExists(file){
		var depth = this.header;
		
		file = this.resolve(file);
		
		for(var file of file.split('/'))if(!(depth = depth.files[file]))return false;
		
		return true;
	}
	async createFolder(file){
		var depth = this.header;
		
		file = this.resolve(file);
		
		for(var file of file.split('/'))depth = depth.files[file] || (depth.files[file] = { files: {} });
	}
	async writeFile(file, data){
		var depth = this.header;
		
		file = this.resolve(file);
		
		for(var file of file.split('/'))depth = depth.files[file] || (depth.files[file] = {});
		
		depth.data = Buffer.from(data);
	}
	async readFolder(dir){
		var depth = this.header;
		
		file = this.resolve(file);
		
		for(var file of file.split('/'))if(!(depth = depth.files[file]))throw new Error('File ' + file + ' not found');
		
		if(!depth.files)throw new TypeError('Attempting to read a file as a folder');
		
		return Object.keys(depth.files);
	}
	async readFile(file){
		var depth = this.header;
		
		file = this.resolve(file);
		
		for(var file of file.split('/'))if(!(depth = depth.files[file]))throw new Error('File ' + file + ' not found');
		
		if(depth.files)throw new TypeError('Attempting to read a folder as a file');
		
		var output = Buffer.alloc(depth.size);
		
		var handle = await fs.promises.open(this.file, 'r');
		
		await handle.read(output, 0, output.byteLength, +depth.offset + this.header.size + 8);
		
		await handle.close();
		
		return output;
	}
	async open(file){
		this.file = file;
		
		var handle = await fs.promises.open(this.file, 'r'),
			size_buf = Buffer.alloc(8);
		
		if((await handle.read(size_buf, 0, size_buf.byteLength, 0)).bytesRead != size_buf.byteLength){
			await handle.close();
			throw new Error('Unable to read header size (V0 format)');
		}
		
		var size = size_buf.readUInt32LE(4),
			header_buf = Buffer.alloc(size - 8);
		
		if((await handle.read(header_buf, 0, header_buf.byteLength, 16)).bytesRead != header_buf.byteLength){
			await handle.close();
			throw new Error('Unable to read header (V0 format)');
		}
		
		await handle.close();
		
		try{
			// remove padding
			this.header = JSON.parse(header_buf.toString().replace(/\0+$/g, '')); 
			this.header.size = size;
		}catch(err){
			throw new Error('Unable to parse header (assumed old format)');
		}
	}
	async save(save){
		var write = Buffer.alloc(0),
			iterate = async (folder, tree) => {
				var files = {};
				
				for(var name in folder.files){
					var file = folder.files[name],
						location = path.posix.join(...tree, name);
					
					if(file.files){ // folder
						files[name] = await iterate(file, [ ...tree, name ]);
					}else{
						files[name] = {
							size: file.size,
							offset: write.byteLength + '',
						};
						
						if(file.data){
							files[name].size = file.data.byteLength;
							write = Buffer.concat([ write, file.data ]);
							
							delete file.data;
						}else write = Buffer.concat([ write, await this.readFile(location) ]);
					}
				}
				
				return { files: files };
			},
			header = Buffer.from(JSON.stringify(await iterate(this.header, []))),
			header_size_buf = Buffer.alloc(16);
		
		header_size_buf.writeUInt32LE(0x4, 0)
		header_size_buf.writeUInt32LE(header.byteLength + 8, 4)
		header_size_buf.writeUInt32LE(header.byteLength + 4, 8)
		header_size_buf.writeUInt32LE(header.byteLength, 12)
		
		await fs.promises.writeFile(save || this.file, Buffer.concat([ header_size_buf, header, write ]));
		
		this.header.size = header.byteLength;
		this.header = header;
	}
};

module.exports = Asar;