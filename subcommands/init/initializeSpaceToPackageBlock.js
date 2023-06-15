/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { headLessConfigStore } = require('../../configstore')
const { lrManager } = require('../../utils/locaRegistry/manager')

const initializeSpaceToPackageBlock = async (blockFinalName, blockId) => {
  await lrManager.init()
  lrManager.linkSpaceToPackageBlock({
    blockId,
    name: blockFinalName,
    space_id: headLessConfigStore().get('currentSpaceId'),
    space_name: headLessConfigStore().get('currentSpaceName'),
  })
}

module.exports = initializeSpaceToPackageBlock
