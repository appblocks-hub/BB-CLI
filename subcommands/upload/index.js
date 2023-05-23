/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-continue */

const chalk = require('chalk')
const deployConfig = require('../deploy/manager')
const { logFail } = require('../../utils')
const { readInput } = require('../../utils/questionPrompts')
const onPremUpload = require('./onPrem')
const abPremUpload = require('./abPrem')
const { appConfig } = require('../../utils/appconfigStore')
const { checkIfAppAndEnvExist } = require('./util')

const upload = async (blockName, options) => {
  try {
    await appConfig.init()
    deployConfig.init()

    const { environment, configName } = options

    if (!configName && !environment) {
      logFail(`\nPlease pass the environment or configuration name..`)
      process.exit(1)
    }

    const appData = deployConfig.deployAppConfig
    const appId = appData.app_id

    if (!appId) {
      logFail(`\nPlease create app before upload..`)
      process.exit(1)
    }

    let envData = {}
    let uploadPremise = 0
    if (!configName) {
      envData = await checkIfAppAndEnvExist({ appData, environment })
      uploadPremise = await readInput({
        type: 'list',
        name: 'uploadPremise',
        message: 'Select the upload server',
        choices: [
          { name: 'On-Premise', value: 0 },
          { name: 'Appblocks-Premise (coming soon)', value: 1, disabled: true },
        ],
        default: 0,
      })
    }

    if (uploadPremise === 0) {
      await onPremUpload({ blockName, envData, appData, environment, appConfig, configName })
    } else {
      await abPremUpload({ blockName, envData, appData, environment, appConfig })
    }
  } catch (error) {
    console.log(chalk.red(error.message))
  }
}

module.exports = upload

/**
 * archiver package eg, for zipping
 */
// https://stackoverflow.com/questions/65960979/node-js-archiver-need-syntax-for-excluding-file-types-via-glob
// const fs = require('fs');
// const archiver = require('archiver');
// const output = fs.createWriteStream(__dirname);
// const archive = archiver('zip', { zlib: { level: 9 } });
// archive.pipe(output);
// archive.glob('*/**', {
//    cwd: __dirname,
//    ignore: ['**/node_modules/*', '.git', '*.zip']
// });
// archive.finalize();
