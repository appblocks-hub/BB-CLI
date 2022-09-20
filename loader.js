const chalk = require('chalk')
const ora = require('ora')
const Spinnies = require('spinnies')

const spinnies = new Spinnies({
  succeedColor: 'whiteBright',
  failColor: 'whiteBright',
  succeedPrefix: chalk.bgGreen(chalk.whiteBright('SUCCESS')),
  failPrefix: chalk.bgRed(chalk.whiteBright('FAIL')),
})
const spinner = ora()
module.exports = { spinner, spinnies }
