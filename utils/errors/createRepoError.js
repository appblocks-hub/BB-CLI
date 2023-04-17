/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { BBError } = require('./baseError')

class CreateRepoError extends BBError {
  /**
   *
   * @constructor
   * @param {string} message
   * @param {(0 | 1)} type
   */
  constructor(message, type) {
    super(`${message}`)
    this.type = type
  }
}

module.exports = { CreateRepoError }
