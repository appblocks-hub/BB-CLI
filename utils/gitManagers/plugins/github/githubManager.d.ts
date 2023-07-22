/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { GitManager } from '../../gitManager'

declare class GithubManager extends GitManager {
  constructor(config: GitManagerConfig)
  readonly isGithubManager: true
}
export = GithubManager
