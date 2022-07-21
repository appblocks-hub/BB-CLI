/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')

const rootDir = null
function getAbsPath(relative) {
  return path.normalize(`${global.rootDir}/${relative}`)
}

module.exports = { getAbsPath, rootDir }
