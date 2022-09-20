/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { exec } = require('child_process')
const os = require('os')

/**
 * To check whether in WSL,
 * @returns {String|Error} WSL string if in wsl or error
 */
function wslCheck() {
  return new Promise((res, rej) => {
    const s = exec(
      `set -e && if grep -qEis "(Microsoft|WSL)" /proc/sys/kernel/osrelease ; then echo "WSL"; else echo "notWSL"; fi`,
      { cwd: os.homedir() }
    )
    s.stderr.on('data', (data) => rej(data.trim()))
    s.stdout.on('data', (data) => res(data.trim()))
  })
}

module.exports = wslCheck
