const ora = require('ora')
const Spinnies = require('spinnies')

const spinnies = new Spinnies({
  succeedColor: 'whiteBright',
  failColor: 'whiteBright',
})
const spinner = ora()
module.exports = { spinner, spinnies }
