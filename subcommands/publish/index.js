/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const open = require('open')

const { spinnies } = require('../../loader')
const { appConfig } = require('../../utils/appconfigStore')
const { publishPackageBlock } = require('./publishPackageBlock')
const publishBlock = require('./publishBlock')
const { publishRedirectApi } = require('../../utils/api')

const publish = async (blockName) => {
  await appConfig.init(null, null)

  if (appConfig.isInBlockContext && !appConfig.isInAppblockContext) {
    // eslint-disable-next-line no-param-reassign
    blockName = appConfig.allBlockNames.next().value
  }

  try {
    // Publish package block
    if (!blockName || appConfig.config.name === blockName) {
      await publishPackageBlock({ appConfig })
    } else {
      // Publish single block
      await publishBlock({ appConfig, blockName })
    }

    spinnies.stopAll()
    await open(`${publishRedirectApi}`)
  } catch (error) {
    spinnies.add('p1', { text: 'Error' })
    spinnies.fail('p1', { text: error.message })
    spinnies.stopAll()
    process.exit(1)
  }
}

module.exports = publish
