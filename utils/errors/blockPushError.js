/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { BBError } = require('./baseError')

class BlockPushError extends BBError {
  constructor(path, block, message, resetHead, exitCode) {
    super(`${message} in ${path}`)
    this.blockPath = path
    this.blockName = block
    this.resetHead = resetHead
    this.processExitCode = exitCode
  }
}

module.exports = { BlockPushError }
