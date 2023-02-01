/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { configstore } = require('../../configstore')
const { lrManager } = require('../../utils/locaRegistry/manager')

const initializeSpaceToPackageBlock = async (blockFinalName) => {
  await lrManager.init()
  lrManager.linkSpaceToPackageBlock({
    name: blockFinalName,
    space_id: configstore.get('currentSpaceId'),
    space_name: configstore.get('currentSpaceName'),
  })
}

module.exports = initializeSpaceToPackageBlock
