/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { tmpdir } = require('os')
const { existsSync, cp, rmSync } = require('fs')
const { AsyncSeriesHook } = require('tapable')

// eslint-disable-next-line no-unused-vars
const { feedback } = require('../../utils/cli-feedback')
// eslint-disable-next-line no-unused-vars
const { Logger } = require('../../utils/loggerV2')
// eslint-disable-next-line no-unused-vars
const { spinnies } = require('../../loader')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const PackageConfigManager = require('../../utils/configManagers/packageConfigManager')

class PullCore {
  constructor(cmdArguments, cmdOptions, options) {
    this.cmdArgs = cmdArguments
    this.cmdOpts = cmdOptions

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
    this.tempAppblocksFolder = path.join(this.tempPath, '_appblocks_')
    this.isOutOfContext = false
    this.blockPullKeys = {}
    this.pullBlockName = ''
    this.blockClonePath = ''

    this.packageManager = null
    this.packageConfig = {}

    this.hooks = {
      beforePull: new AsyncSeriesHook(['core']),
      afterPull: new AsyncSeriesHook(['core']),
    }
  }

  async initializeConfig() {
    const configPath = path.resolve(BB_CONFIG_NAME)
    const { manager: configManager, error } = await ConfigFactory.create(configPath)
    if (error) {
      if (error.type !== 'OUT_OF_CONTEXT') throw error
      this.isOutOfContext = true
    } else if (configManager instanceof PackageConfigManager) {
      this.packageManager = configManager
      this.packageConfig = this.packageManager.config
    } else throw new Error('Not inside a package context')
  }

  async pullTheBlock() {
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
            rmSync(tmpPath, { recursive: true, force: true })
          })
        }
      }

      if (error.message.includes('already exist')) throw error

      if (this.blockClonePath && existsSync(this.blockClonePath)) {
        rmSync(this.blockClonePath, { recursive: true, force: true })
      }

      throw error
    }
  }
}

module.exports = PullCore
