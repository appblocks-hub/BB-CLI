/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

class BBError extends Error {
  constructor(message) {
    super(message)
    this.name = this.constructor.name
  }
}

module.exports = { BBError }
