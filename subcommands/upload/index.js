/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-continue */

const { rm } = require('fs')
const path = require('path')
const chalk = require('chalk')
const { default: axios } = require('axios')
const { appRegistryCheckAppEnvExist } = require('../../utils/api')
const { getShieldHeader } = require('../../utils/getHeaders')
const deployConfig = require('../deploy/manager')
const { spinnies } = require('../../loader')
const { logFail } = require('../../utils')
const { readInput } = require('../../utils/questionPrompts')
const onPremUpload = require('./onPrem')
const abPremUpload = require('./abPrem')

const upload = async (blockName, options) => {
  deployConfig.init()

  const { environment } = options
  const appData = deployConfig.deployAppConfig
  const appId = appData.app_id

  if (!appId) {
    logFail(`\nPlease create app before upload..`)
    process.exit(1)
  }

  const envData = appData.environments[environment]
  envData.environment_name = environment
  if (!envData) {
    logFail(`${environment} environment not exist. Please create-env and try again\n`)

    const envs = Object.keys(appData.environments)
    if (envs.length) {
      console.log(chalk.gray(`Existing environments are ${envs}\n`))
    }

    process.exit(1)
  }

  spinnies.add('up', { text: `Checking app details` })

  // Check if app and env exist in server
  try {
    const { data } = await axios.post(
      `${appRegistryCheckAppEnvExist}`,
      {
        app_id: appId,
        environment_id: envData.environment_id,
      },
      {
        headers: getShieldHeader(),
      }
    )

    const resData = data.data

    if (!resData) throw new Error(`Invalid response`)

    if (!resData.app_exist || !resData.env_exist) {
      const dpath = path.resolve(deployConfig.configName)
      spinnies.fail('up', { text: ` ${!resData.app_exist ? 'App' : 'Environment'} does not exist` })
      rm(dpath, () => {
        process.exit(1)
      })
    }
  } catch (error) {
    spinnies.fail('up', { text: 'Error checking app data' })
    process.exit(1)
  }
  spinnies.remove('up')

  const uploadPremise = await readInput({
    type: 'list',
    name: 'uploadPremise',
    message: 'Select the upload server',
    choices: [
      { name: 'On-Premise', value: 0 },
      { name: 'Appblocks-Premise (coming soon)', value: 1, disabled: true },
    ],
    default: 0,
  })

  if (uploadPremise === 0) {
    await onPremUpload({ blockName, envData, appData, environment })
  } else {
    await abPremUpload({ blockName, envData, appData, environment })
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
