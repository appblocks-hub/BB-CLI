/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { default: axios } = require('axios')
const chalk = require('chalk')
const { spinnies } = require('../loader')
const { appBlockUpdateAppConfig } = require('../utils/api')
const { appConfig } = require('../utils/appconfigStore')
const { feedback } = require('../utils/cli-feedback')
const { getShieldHeader } = require('../utils/getHeaders')

const push_config = async () => {
  await appConfig.init()
  if (appConfig.isInBlockContext && !appConfig.isInAppblockContext) {
    feedback({ type: 'error', message: 'Not an appblock' })
    process.exit(1)
  }

  spinnies.update('pushConfig', { text: 'Preparing config to upload' })
  const data = {
    block_id: appConfig.packageBlockId,
    app_config: appConfig.getAppConfig(),
  }
  spinnies.update('pushConfig', { text: 'Pushing..' })
  try {
    await axios.post(appBlockUpdateAppConfig, { ...data }, { headers: getShieldHeader() })
    spinnies.succeed('pushConfig', { text: 'Appconfig pushed!' })
  } catch (err) {
    spinnies.fail('pushConfig', { text: 'Failed!' })
    console.log(chalk.dim(err.message))
    console.log(chalk.red(`Couldn't upload ..try again later`))
  }
  spinnies.remove('pushConfig')
}

module.exports = push_config
