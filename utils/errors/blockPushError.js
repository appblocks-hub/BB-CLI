/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { BBError } = require('./baseError')

class BlockPushError extends BBError {
  constructor(blockPath, block, message, resetHead, exitCode) {
    const relPath = path.relative(path.resolve(), blockPath)
    super(`${message} in ${blockPath === '.' || !relPath ? block : relPath}`)
    this.blockPath = blockPath
    this.blockName = block
    this.resetHead = resetHead
    this.processExitCode = exitCode
  }
}

module.exports = { BlockPushError }
