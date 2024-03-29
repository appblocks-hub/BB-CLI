/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-console */
const chalk = require('chalk')
const { execSync } = require('child_process')
const os = require('os')
const wslCheck = require('./wslCheck')

module.exports = async function pbcopy(data) {
  try {
    switch (os.platform()) {
      case 'darwin':
        execSync(`echo ${data} | xargs echo -n | pbcopy`)
        break
      case 'win32':
        execSync(`echo | set /p=${data}| clip`)
        break
      case 'linux':
        try {
          const t = await wslCheck()
          if (t === 'WSL') {
            execSync(`echo ${data} | xargs echo -n | clip.exe`)
          } else {
            execSync('xclip -h', { stdio: 'ignore' })
            execSync(`echo ${data}| xargs echo -n | xclip -sel clip`, {
              stdio: 'ignore',
            })
          }
        } catch (e) {
          if (e.status === 127) {
            console.log(chalk.italic.gray('Please run the following command, so i can copy code for you!'))
            console.log(chalk.green('sudo apt install xclip'))
            throw new Error('')
          } else {
            console.log('Error copying code to clipboard')
          }
        }
        break
      default:
        console.log(`Please copy ${data} and paste...`)
        break
    }
  } catch (e) {
    console.log(`\n\nCouldn't copy to clipboard`, e.message)
    console.log(`Please copy ${chalk.whiteBright.bold(data)} and paste...`)
  }
}
