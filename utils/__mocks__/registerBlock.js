/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */

module.exports = jest.fn((type, name, ...rest) => {
  if (name === 'success') {
    return Promise.resolve({ data: { err: false, msg: 'success' } })
  }
  if (name === 'fail') {
    return Promise.resolve({ data: { err: true, msg: 'fail' } })
  }
})
