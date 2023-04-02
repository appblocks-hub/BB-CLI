/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { spinnies } = require('../../loader')
const { appConfig } = require('../../utils/appconfigStore')
const createBlockVersion = require('./createBlockVersion')
const { createPackageVersion } = require('./createPackageVersion')

const createVersion = async (blockName, args) => {
  await appConfig.init(null, null)

  if (appConfig.isInBlockContext && !appConfig.isInAppblockContext) {
    // eslint-disable-next-line no-param-reassign
    blockName = appConfig.allBlockNames.next().value
  }

  try {
    if (!blockName || blockName === appConfig.config.name) {
      await createPackageVersion({ appConfig, args })
    } else {
      await createBlockVersion({ appConfig, blockName })
    }
  } catch (error) {
    console.log(error);
    spinnies.add('p1', { text: 'Error' })
    spinnies.fail('p1', { text: error.message })
    spinnies.stopAll()
    process.exit(1)
  }
}

module.exports = createVersion
