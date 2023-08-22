/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {  ConfigManager, PackageConfig } from '../../gitManager'

declare class BitbucketManager extends ConfigManager<> {
  constructor(config: PackageConfig,)
}

export = BitbucketManager
