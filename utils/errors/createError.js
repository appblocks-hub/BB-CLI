/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { YahError } = require('./baseError')

class CreateError extends YahError {
  constructor(message) {
    super(`${message}`)
  }
}

module.exports = { CreateError }
