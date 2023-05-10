/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { tmpdir } = require('os')
const { existsSync, cp, rm } = require('fs')
const { AsyncSeriesHook } = require('tapable')

const { appConfig } = require('../../utils/appconfigStore')
// eslint-disable-next-line no-unused-vars
const { feedback } = require('../../utils/cli-feedback')
// eslint-disable-next-line no-unused-vars
const { Logger } = require('../../utils/loggerV2')
// eslint-disable-next-line no-unused-vars
const { spinnies } = require('../../loader')

class PullCore {
  constructor(pullByBlock, cmdOptions, options) {
    this.cmdArgs = { pullByBlock }
    this.cmdOpts = { ...cmdOptions }

    /**
     * @type {logger}
     */
    this.logger = options.logger
    /**
     * @type {feedback}
     */
    this.feedback = options.feedback
    /**
     * @type {spinnies}
     */
    this.spinnies = options.spinnies

    this.cwd = process.cwd()
    this.blockToPull = null
    this.blockDetails = {}
    this.tempPath = tmpdir()
    this.tempAppblocksFolder = `${this.tempPath}/_appblocks_/`

    this.hooks = {
      beforePull: new AsyncSeriesHook(['core']),
      afterPull: new AsyncSeriesHook(['core']),
    }
  }

  async initializeAppConfig() {
    if (!this.cmdArgs.pullByBlock) {
      this.cwd = path.dirname(this.cwd)
    }

    await appConfig.initV2(this.cwd, null, 'pull')
    this.appConfig = appConfig || {}
  }

  async pullBlock() {
    try {
      await this.hooks.beforePull?.promise(this)

      // core things

      await this.hooks.afterPull?.promise(this)
    } catch (error) {
      if (this.blockDetails.pull_by_config_folder_name) {
        const tmpPath = path.join(this.tempAppblocksFolder, this.blockDetails.pull_by_config_folder_name)
        if (this.blockDetails.pull_by_config && existsSync(tmpPath)) {
          cp(tmpPath, this.blockDetails.pull_by_config_folder_name, { recursive: true }, (err) => {
            if (err) feedback({ type: 'info', err })
            rm(tmpPath, { recursive: true, force: true }, () => {})
          })
        }
      }

      throw error
    }
  }
}

module.exports = PullCore
