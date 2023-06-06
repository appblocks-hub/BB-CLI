/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { spinnies } = require('../../loader')
const createBlockVersion = require('./createBlockVersion')
const { createPackageVersion } = require('./createPackageVersion')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const BlockConfigManager = require('../../utils/configManagers/blockConfigManager')
const PackageConfigManager = require('../../utils/configManagers/packageConfigManager')

const createVersion = async (blockName, opts) => {
  // await appConfig.init(null, null)
  const { manager, e } = await ConfigFactory.create(path.resolve(BB_CONFIG_NAME))

  if (e) {
    console.log(e)
    return
  }
  // if (appConfig.isInBlockContext && !appConfig.isInAppblockContext) {
  //   // eslint-disable-next-line no-param-reassign
  //   blockName = appConfig.allBlockNames.next().value
  // }

  if (manager instanceof BlockConfigManager && manager.config.name !== blockName) {
    console.log(`Currently inside ${manager.config.name}, cannot create version for ${blockName} from here`)
    return
  }

  try {
    if (manager instanceof PackageConfigManager) {
      await createPackageVersion(manager, opts)
    }
    if (manager instanceof BlockConfigManager) {
      await createBlockVersion(manager, blockName)
    }
  } catch (error) {
    spinnies.add('p1', { text: 'Error' })
    spinnies.fail('p1', { text: error.message })
    spinnies.stopAll()
    process.exit(1)
  }
}

module.exports = createVersion
