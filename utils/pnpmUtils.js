/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { execSync } = require('child_process')

/**
 * Checks if pnpm is executable
 * @returns {boolean}
 */
const checkPnpm = () => {
  try {
    execSync('pnpm -v', { stdio: 'ignore' })
    return true
    // console.log(`Seems like pnpm is installed`)
  } catch {
    return false
  }
}

module.exports = {
  checkPnpm,
}
