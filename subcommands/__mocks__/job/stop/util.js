/* eslint-disable no-undef */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const linuxCronStop = jest.fn()
const darwinCronStop = jest.fn()
const windowsCronStop = jest.fn()
const wslCronStop = jest.fn()

module.exports = {
  linuxCronStop,
  darwinCronStop,
  windowsCronStop,
  wslCronStop,
}
