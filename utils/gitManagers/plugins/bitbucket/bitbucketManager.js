/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const GitManager = require('../../gitManager')

class BitbucketManager extends GitManager {
  constructor(config) {
    super(config)
    this.isBitbucketManager = true
  }
}
module.exports = BitbucketManager
