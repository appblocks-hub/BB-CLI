/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const open = require('open')
/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

class HandleAfterPublish {
  /**
   *
   * @param {PublishCore} core
   */
  apply(publishCore) {
    publishCore.hooks.beforePublish.tapPromise('HandleAfterPublish', async (core) => {
      const { publishRedirectApi, cmdOpts } = core
      const { open: openFlag } = cmdOpts

      if (openFlag) {
        await open(`${publishRedirectApi}`)
      }
    })
  }
}

module.exports = HandleAfterPublish
