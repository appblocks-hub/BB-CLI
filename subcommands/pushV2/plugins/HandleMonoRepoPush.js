/* eslint-disable no-param-reassign */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable class-methods-use-this */

// eslint-disable-next-line no-unused-vars
const PushCore = require('../pushCore')

class HandleMonoRepoPush {
  /**
   *
   * @param {PushCore} pushCore
   */
  apply(pushCore) {
    pushCore.hooks.beforePush.tapPromise(
      'HandleMonoRepoPush',
      async (
        /**
         * @type {PushCore}
         */
        core
      ) => {
        if (core.appConfig.config?.repoType !== 'mono') return

        const { force } = core.cmdOpts
        if (!force) return

        core.blocksToPush = [
          {
            directory: core.cwd,
            meta: {
              source: core.appConfig.config?.source,
              name: core.appConfig.config?.name,
              type: 'package',
              repoType: 'mono',
            },
          },
        ]
      }
    )
  }
}
module.exports = HandleMonoRepoPush
