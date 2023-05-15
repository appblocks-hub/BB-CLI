/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { readInput } = require('../../utils/questionPrompts')
const deployConfigManager = require('./manager')
const abPremDeploy = require('./abPrem')
const onPremDeploy = require('./onPrem')

const deploy = async (options) => {
  try {
    await deployConfigManager.init()

    const appData = deployConfigManager.deployAppConfig

    if (!appData?.app_id) {
      console.log(chalk.red(`Deploy app does not exist. Please create-app and try again\n`))
      process.exit(1)
    }

    let deployMethodType = 0
    if (!options.configName) {
      deployMethodType = await readInput({
        type: 'list',
        name: 'deployId',
        message: 'Select the deployment server',
        choices: [
          { name: 'On-Premise', value: 0 },
          { name: 'Appblocks-Premise (coming soon)', value: 1, disabled: true },
        ],
        default: 0,
      })
    }

    if (deployMethodType === 0) {
      await onPremDeploy({ argOptions: options, appData, deployConfigManager })
    } else {
      await abPremDeploy({ argOptions: options, appData, deployConfigManager })
    }
  } catch (error) {
    console.log(chalk.red(error.message))
  }
}

module.exports = deploy
