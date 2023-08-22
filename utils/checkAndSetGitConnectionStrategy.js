/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { exec } = require('child_process')
const { readInput } = require('./questionPrompts')
const GitConfigFactory = require('./gitManagers/gitConfigFactory')

async function checkAndSetGitConnectionPreference() {
  const { manager, error } = await GitConfigFactory.init()
  if (error) throw error

  let pref = manager.config.prefersSsh

  if (pref === '') {
    const p = await getConnectionStrategyPreference()
    pref = p === 'SSH'
    await manager.setConfig('prefersSsh', pref)
  }

  if (pref) {
    try {
      const presentName = manager.config.userName
      const sshName = await checkSSH()
      if (sshName === presentName) return true

      console.log(chalk.blueBright(`Please sign into ${sshName}'s account for a seamless developer experience`))
      console.log(`Use ${chalk.blueBright('bb connect github -f')} to restart github login`)
      await manager.deleteConfig(['prefersSsh'])
      throw new Error('Key of different user')
    } catch (err) {
      console.log(err.message)
      await manager.deleteConfig(['prefersSsh'])
      process.exit(1)
    }
  }

  try {
    const gitPat = manager.config.userPAT
    if (gitPat === '') await getAndSetGitPat(manager)
  } catch (err) {
    console.log('Error on dealing with git PAT')
    console.log(err.message)
    await manager.deleteConfig(['prefersSsh', 'userPAT'])
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
async function getAndSetGitPat(manager) {
  const token = await readInput({
    message: 'Drop PAT here..',
    name: 'gitPat',
    validate: (ans) => {
      if (ans) return true
      return 'Please enter a string here'
    },
  })
  await manager.setConfig('userPAT', `${token.trim()}`)
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
