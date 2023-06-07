/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { headLessConfigStore } = require('../../configstore')
const { spinnies } = require('../../loader')
const { feedback } = require('../../utils/cli-feedback')
const { Logger } = require('../../utils/loggerV2')
const HandleBeforePush = require('./plugins/HandleBeforePush')
const HandleMonoRepoPush = require('./plugins/HandleMonoRepoPush')
const HandleMultiRepoPush = require('./plugins/HandleMultiRepoPush')
const PushCore = require('./pushCore')

async function push(blockName, cmdOptions) {
  const { logger } = new Logger('push')
  const Push = new PushCore(blockName, cmdOptions, { logger, spinnies, feedback })

  if (process.env.BB_CLI_RUN_HEADLESS) {
    global.HEADLESS_CONFIGS = headLessConfigStore.store
  }

  try {
    new HandleBeforePush().apply(Push)
    new HandleMonoRepoPush().apply(Push)
    new HandleMultiRepoPush().apply(Push)

    await Push.initializeConfig()
    await Push.pushBlocks()
  } catch (error) {
    logger.error(error)
    spinnies.add('err', { text: error.message })
    spinnies.fail('err', { text: error.message })
  }
  spinnies.stopAll()
}

module.exports = push
