/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const ConfigFactory = require('../../utils/configManagers/configFactory')

async function updateAllMemberConfig(manger, source) {
  for await (const blockManager of manger.getDependencies()) {
    if (!blockManager?.config) continue

    const { type } = blockManager.config
    // eslint-disable-next-line no-param-reassign
    source.branch = `orphan-${manger.config.name}`
    blockManager.updateConfig({ source })

    if (type === 'package') {
      await updateAllMemberConfig(blockManager, source)
    }
  }
}

async function initializeConfig() {
  const configPath = path.resolve('block.config.json')
  const { manager: configManager, error } = await ConfigFactory.create(configPath)
  if (error) {
    if (error.type !== 'OUT_OF_CONTEXT') throw error
    throw new Error('Cannot run bb command outside of bb context')
  }
  return configManager
}

module.exports = { initializeConfig, updateAllMemberConfig }
