/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */

module.exports = jest.fn().mockImplementation(() => ({
  blockSource: {
    ssh: '',
    https: '',
  },
  cloneDirName: 'a-name',
  clonePath: 'a/b/c',
  blockFinalName: 'a-name',
}))
