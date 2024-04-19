/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { spinnies } = require('../../loader')
const { feedback } = require('../../utils/cli-feedback')
const { Logger } = require('../../utils/logger')
const HandleGetPullBlockDetails = require('./plugins/HandleGetPullBlockDetails')
const HandlePackagePull = require('./plugins/HandlePackagePull')
const HandleBlockPull = require('./plugins/HandleBlockPull')
const PullCore = require('./pullCore')
const HandleOutOfContext = require('./plugins/HandleOutOfContext')
const HandleAddVariant = require('./plugins/HandleAddVariant')
const HandleNoVariant = require('./plugins/HandleNoVariant')
const HandleBeforePull = require('./plugins/HandleBeforePull')
const HandleCheckPurchasedPull = require('./plugins/HandleCheckPurchasedPull')
const HandleAfterPull = require('./plugins/HandleAfterPull')
const HandleContainerizedPackagePull = require('./plugins/HandleContainerizedPackagePull')
const { handleBBConfigPlugin } = require('../../utils/plugins')

async function pull(pullBlock, pullBlockNewName, cmdOptions) {
  const { logger } = new Logger('pull')
  const core = new PullCore({ pullBlock, pullBlockNewName }, cmdOptions, { logger, spinnies, feedback })
  try {
    new HandleGetPullBlockDetails().apply(core)
    new HandleOutOfContext().apply(core)
    new HandleBeforePull().apply(core)
    new HandleAddVariant().apply(core)
    new HandleNoVariant().apply(core)
    new HandleCheckPurchasedPull().apply(core)
    new HandleBlockPull().apply(core)
    new HandlePackagePull().apply(core)
    new HandleContainerizedPackagePull().apply(core)

    new HandleAfterPull().apply(core)

    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(cmdOptions.configPath, core)

    await core.initializeConfig()
    await core.pullTheBlock()
  } catch (error) {
    logger.error(error)
    spinnies.add('err', { text: error.message })
    spinnies.fail('err', { text: error.message })
  }
  spinnies.stopAll()
}

module.exports = pull
