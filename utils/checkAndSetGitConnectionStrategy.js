/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { exec } = require('child_process')
const { configstore } = require('../configstore')
const { readInput } = require('./questionPrompts')

async function checkAndSetGitConnectionPreference() {
  let pref = configstore.get('prefersSsh', '')

  if (pref === '') {
    const p = await getConnectionStrategyPreference()
    pref = p === 'SSH'
    configstore.set('prefersSsh', pref)
  }

  if (pref) {
    try {
      const presentName = configstore.get('githubUserName')
      const sshName = await checkSSH()
      if (sshName === presentName) return true

      console.log(chalk.blueBright(`Please sign into ${sshName}'s account for a seamless developer experience`))
      console.log(`Use ${chalk.blueBright('bb connect github -f')} to restart github login`)
      configstore.delete('prefersSsh')
      throw new Error('Key of different user')
    } catch (err) {
      console.log(err.message)
      configstore.delete('prefersSsh')
      process.exit(1)
    }
  }

  try {
    const gitPat = configstore.get('gitPersonalAccessToken', '')
    if (gitPat === '') await getAndSetGitPat()
  } catch (err) {
    console.log('Error on dealing with git PAT')
    console.log(err.message)
    configstore.delete('prefersSsh')
    configstore.delete('gitPersonalAccessToken')
    process.exit(1)
  }

  return true
}

async function getConnectionStrategyPreference() {
  const p = await readInput({
    type: 'list',
    name: 'connPref',
    message: 'Which connection do you prefer',
    choices: ['Personnel Access Token', 'SSH'],
  })
  return p
}
async function getAndSetGitPat() {
  const token = await readInput({
    message: 'Drop PAT here..',
    name: 'gitPat',
    validate: (ans) => {
      if (ans) return true
      return 'Please enter a string here'
    },
  })
  await configstore.set('gitPersonalAccessToken', `${token.trim()}`)
}
/**
 * TODO -- this is repeated in createRepo
 */
function checkSSH() {
  return new Promise((res, rej) => {
    exec('ssh -T git@github.com', (error, stdout, stdError) => {
      if (error.code < 2) {
        res(stdError.match(/(?<=Hi ).*(?=!)/)[0])
      }
      rej(new Error('Failed connection:SSH set up'))
    })
  })
}

module.exports = checkAndSetGitConnectionPreference
