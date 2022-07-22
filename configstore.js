const Conf = require('conf')
// const pkg = require('./package.json')
// const schema = {
// 	foo: {
// 		type: 'number',
// 		maximum: 100,
// 		minimum: 1,
// 		default: 50
// 	},
// 	bar: {
// 		type: 'string',
// 		format: 'url'
// 	}
// };

const config = new Conf()
module.exports = {
  configstore: config,
}
