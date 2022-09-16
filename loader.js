const ora = require('ora')
const Spinnies = require('spinnies')

const spinnies = new Spinnies()
const spinner = ora()
module.exports = { spinner, spinnies }
