/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = { blockTypeInverter }
const { blockTypes } = require('./blockTypes')

function blockTypeInverter(type) {
  if (typeof type === 'string' || typeof type === 'number') {
    const s = blockTypes.findIndex((v) => v[0] === type)
    const t = blockTypes.findIndex((v) => v[1] === type)
    if (s >= 0) {
      return blockTypes[s][1]
    }
    if (t >= 0) return blockTypes[t][0]

    throw new Error(`Type(${type}) doesn't follow any predefined rules`)
  }
  throw new Error('Type must be a string or number')
}
