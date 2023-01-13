/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable camelcase */
const { default: axios } = require('axios')
const { rm } = require('fs')
const path = require('path')

const { getShieldHeader } = require('../utils/getHeaders')
const { appRegistryDeleteApp } = require('../utils/api')
const deployConfig = require('./deploy/manager')
const { spinnies } = require('../loader')
const { confirmationPrompt } = require('../utils/questionPrompts')

const deleteApp = async () => {
  deployConfig.init()
  const appConfig = await deployConfig.deployAppConfig

  if (!appConfig?.app_id) {
    console.log(`No app found`)
    process.exit(1)
  }

  const confirm = await confirmationPrompt({
    name: 'deleteApp',
    message: 'Do you want to delete the app?',
    default: false,
  })

  if (!confirm) {
    spinnies.add('da')
    spinnies.succeed('da', { text: 'App deletion cancelled' })
    return
  }

  spinnies.add('da', { text: `Deleting ${appConfig.app_name} app` })

  // logger.info('------------------------------------------------------------')
  try {
    await axios.post(
      appRegistryDeleteApp,
      { app_id: appConfig.app_id },
      {
        headers: getShieldHeader(),
      }
    )

    rm(path.resolve(deployConfig.cwd, deployConfig.configName), () => {})

    spinnies.succeed('da', { text: 'App deleted successfully' })
  } catch (err) {
    spinnies.fail('da', { text: err.message })
    console.log(err.message || err)
  }
}

module.exports = deleteApp
