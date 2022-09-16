/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */

const isDirClean = jest.fn()
const wipeAllFilesIn = jest.fn()
const createFileSync = jest.fn()

module.exports = {
  isDirClean,
  wipeAllFilesIn,
  createFileSync,
}
