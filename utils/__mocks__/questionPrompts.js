/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */

const getPrefix = jest.fn()
const getBlockName = jest.fn().mockResolvedValue('TODO')
const getBlockType = jest.fn()
const WipeAllConfirmation = jest.fn().mockResolvedValue({ wipeAll: true })
const confirmationPrompt = jest.fn()
const readInput = jest.fn()

module.exports = {
  readInput,
  getPrefix,
  getBlockName,
  getBlockType,
  WipeAllConfirmation,
  confirmationPrompt,
}
