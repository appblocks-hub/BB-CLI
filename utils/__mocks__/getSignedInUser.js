/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */

const getGithubSignedInUser = jest.fn().mockResolvedValue({ user: { userId: 'r', userName: 'arjun' }, err: null })
const getYahiloSignedInUser = jest.fn()

module.exports = {
  getGithubSignedInUser,
  getYahiloSignedInUser,
}
