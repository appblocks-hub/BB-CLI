/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const fs = require('fs')

/**
 *
 * Condiotions for validity,
 * should have a config with type and mapping
 * folder structure should match that of the config
 * Run a prompt to reconfigure if mismatch is found
 */

/**
 * If present config and file structure is okay,
 * returns true,
 * else if config is present and mismatch is found,
 * runs reconfiguring and if that fails returns false,
 * if reconfiguring is success, returns true
 * @param {*} dir
 * @returns
 */
// eslint-disable-next-line consistent-return
module.exports = function isValidAppBlockProject(dir) {
  try {
    const files = fs.readdirSync(dir)
    if (files.includes('appblock.config.json')) {
      return true
    }
    return false
  } catch (e) {
    console.log(e)
    if (e.code === 'ENOENT') return false
  }
  // return false;
}
