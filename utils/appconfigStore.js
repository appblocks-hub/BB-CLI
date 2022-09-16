/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { AppblockConfigManager } = require('./appconfig-manager')

const config = new AppblockConfigManager()

module.exports = { appConfig: config }
