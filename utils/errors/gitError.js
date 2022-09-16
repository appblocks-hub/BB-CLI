/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { YahError } = require('./baseError')

class GitError extends YahError {
  constructor(path, message, resetHead, operation, options) {
    super(message)
    this.operation = operation
    this.options = options
    this.gitDirPath = path
    this.resetHead = resetHead
  }
}

module.exports = { GitError }
