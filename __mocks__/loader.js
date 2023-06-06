/**
 * Copyright (c) Appblocks and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-undef */

const spinnies = {
  fail: jest.fn(),
  add: jest.fn(),
  succeed: jest.fn(),
  remove: jest.fn(),
  update: jest.fn(),
  hasActiveSpinners: jest.fn(),
}

module.exports = { spinnies }
