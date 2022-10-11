/* eslint-disable no-undef */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const linuxCronStart = jest.fn()
const darwinCronStart = jest.fn()
const windowsCronStart = jest.fn()
const wslCronStart = jest.fn()

module.exports = {
  linuxCronStart,
  darwinCronStart,
  windowsCronStart,
  wslCronStart,
}
