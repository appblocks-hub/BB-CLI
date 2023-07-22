/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Throws method is not implemented error
 */
const noMethodImplementedError = (gitVendor) => {
  throw new Error(`Method not implemented ${gitVendor ? `in ${gitVendor}` : ''}`)
}

module.exports = { noMethodImplementedError }
