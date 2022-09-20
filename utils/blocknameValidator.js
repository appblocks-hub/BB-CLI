/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const emojiregex = require('emoji-regex')

function isValidBlockName(name) {
  const regex = /^[a-zA-Z-_0-9]+$/
  return regex.test(name) && ![...name.matchAll(emojiregex())].length
}

module.exports = { isValidBlockName }
