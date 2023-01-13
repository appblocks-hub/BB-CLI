/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { BBError } = require('./baseError')

class GitError extends BBError {
  constructor(path, message, resetHead, operation, options) {
    super(message)
    this.operation = operation
    this.options = options
    this.gitDirPath = path
    this.resetHead = resetHead
    this.processExitCode = 1
  }
}

module.exports = { GitError }
