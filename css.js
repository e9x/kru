var parser = require('css-tree');

module.exports = source => 'module.exports=' + JSON.stringify(parser.generate(parser.parse(source)));