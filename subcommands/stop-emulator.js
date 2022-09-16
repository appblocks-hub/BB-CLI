#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { stopEmulator } = require('../utils/emulator-manager')

global.rootDir = process.cwd()

const callStopEmulator = async () => {
  await stopEmulator()
}

console.log('-----------------------------------------------------------')
console.log('-------------------------------------------Calling stop emulator...----------------')
console.log('-----------------------------------------------------------')
callStopEmulator()
// To avoid calling Init twice on tests
// if (process.env.NODE_ENV !== 'test') Init(process.argv)

// module.exports = Init
module.exports = stopEmulator
