/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */

const publish = jest.fn()
const getPublishedVersion = jest.fn().mockReturnValue({ success: true, latestVersion: '0.0.1' })

module.exports = { publish, getPublishedVersion }
