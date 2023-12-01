/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

async function updateAllMemberConfig(manger, source) {
  for await (const blockManager of manger.getDependencies()) {
    if (!blockManager?.config) continue

    blockManager.updateConfig({ source: { ...source, branch: blockManager.config.source.branch } })

    const { type } = blockManager.config

    if (type === 'package') {
      // eslint-disable-next-line no-param-reassign
      await updateAllMemberConfig(blockManager, source)
    }
  }
}

module.exports = { updateAllMemberConfig }
