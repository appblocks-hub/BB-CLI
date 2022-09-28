/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { blockTypeInverter } = require('../blockTypeInverter')

/* eslint-disable */

const createZip = jest.fn(() => {
  Promise.resolve('../test_block.zip')
})

const uploadToServer = jest.fn(({ version, blockId, blockType }) => {
  Promise.resolve({
    block_version: version,
    block_id: blockId,
    object_key: 'object_key',
    block_type: blockTypeInverter(blockType),
  })
})
const checkIfDistExist = jest.fn()

module.exports = {
  createZip,
  uploadToServer,
  checkIfDistExist,
}
