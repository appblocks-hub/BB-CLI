/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { headLessConfigStore } = require('../../configstore')
const { spinnies } = require('../../loader')
const { feedback } = require('../../utils/cli-feedback')
const { Logger } = require('../../utils/logger')
const HandleBeforePush = require('./plugins/HandleBeforePush')
const HandleMonoRepoPush = require('./plugins/HandleMonoRepoPush')
const HandleMultiRepoPush = require('./plugins/HandleMultiRepoPush')
const PushCore = require('./pushCore')
const { handleBBConfigPlugin } = require('../../utils/plugins')

async function push(blockName, cmdOptions) {
  const { logger } = new Logger('push')
  const core = new PushCore(blockName, cmdOptions, { logger, spinnies, feedback })

  if (process.env.BB_CLI_RUN_HEADLESS) {
    global.HEADLESS_CONFIGS = headLessConfigStore().store
  }

  try {
    new HandleBeforePush().apply(core)
    new HandleMonoRepoPush().apply(core)
    new HandleMultiRepoPush().apply(core)


    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(cmdOptions.configPath, core)

    await core.initializeConfig()
    await core.pushBlocks()
  } catch (error) {
    logger.error(error)
    spinnies.add('err', { text: error.message })
    spinnies.fail('err', { text: error.message })
  }
  spinnies.stopAll()
}

module.exports = push
