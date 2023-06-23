/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { spinnies } = require('../../loader')
const { feedback } = require('../../utils/cli-feedback')
const { Logger } = require('../../utils/loggerV2')
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

async function pull(pullBlock, pullBlockNewName, cmdOptions) {
  const { logger } = new Logger('pull')
  const Pull = new PullCore({ pullBlock, pullBlockNewName }, cmdOptions, { logger, spinnies, feedback })
  try {
    new HandleGetPullBlockDetails().apply(Pull)
    new HandleOutOfContext().apply(Pull)
    new HandleBeforePull().apply(Pull)
    new HandleAddVariant().apply(Pull)
    new HandleNoVariant().apply(Pull)
    new HandleCheckPurchasedPull().apply(Pull)
    new HandleBlockPull().apply(Pull)
    new HandlePackagePull().apply(Pull)

    new HandleAfterPull().apply(Pull)

    await Pull.initializeConfig()
    await Pull.pullTheBlock()
  } catch (error) {
    logger.error(error)
    spinnies.add('err', { text: error.message })
    spinnies.fail('err', { text: error.message })
    spinnies.stopAll()
  }
}

module.exports = pull
