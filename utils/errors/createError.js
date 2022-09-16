/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { BBError } = require('./baseError')

class CreateError extends BBError {
  constructor(message) {
    super(`${message}`)
  }
}

module.exports = { CreateError }
