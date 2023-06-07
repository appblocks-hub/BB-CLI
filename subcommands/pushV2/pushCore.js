/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { AsyncSeriesHook } = require('tapable')
// eslint-disable-next-line no-unused-vars
const { feedback } = require('../../utils/cli-feedback')
// eslint-disable-next-line no-unused-vars
const { Logger } = require('../../utils/loggerV2')
// eslint-disable-next-line no-unused-vars
const { spinnies } = require('../../loader')
const { BlockPusher } = require('./utils/blockPusher')
const { multiBar } = require('./utils/multiBar')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const PackageConfigManager = require('../../utils/configManagers/packageConfigManager')
const { BB_CONFIG_NAME } = require('../../utils/constants')

class PushCore {
  constructor(blockName, cmdOptions, options) {
    this.cmdArgs = { blockName }
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
    this.blocksToPush = []

    this.hooks = {
      beforePush: new AsyncSeriesHook(['core']),
      afterPush: new AsyncSeriesHook(['core']),
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

  async pushBlocks() {
    await this.hooks.beforePush?.promise(this)

    const pushReport = {}

    if (this.blocksToPush.length === 0) throw new Error('No blocks to push')

    const promises = []
    // this.noLogs = true
    this.blocksToPush.forEach(async (v) => {
      promises.push(
        new BlockPusher(v, multiBar, this.noLogs).push({
          gitUserEmail: this.gitUserEmail,
          gitUserName: this.gitUserName,
          commitMessage: this.cmdOpts.message,
          blockParentPath: this.cwd,
        })
      )
    })

    Promise.allSettled(promises).then((values) => {
      setTimeout(() => {
        const { success, failed } = values.reduce(
          (acc, v) => {
            if (v.status === 'rejected') {
              pushReport[v.reason.name] = v.reason.data
              return { ...acc, failed: acc.failed + 1 }
            }
            return { ...acc, success: acc.success + 1 }
          },
          { success: 0, failed: 0 }
        )

        if (!this.noLogs) {
          console.log('\n')
          if (success > 0) console.log(`${success} blocks pushed successfully,`)
          if (failed > 0) {
            console.log(`${failed} blocks failed to push..`)
            console.log('Check pushLogs for error details')
          }

          // console.log(pushReport)
          for (const key in pushReport) {
            if (Object.hasOwnProperty.call(pushReport, key)) {
              this.feedback({ type: pushReport[key]?.type, message: pushReport[key]?.message })
            }
          }
        }
        return 'done'
      }, 300)
    })

    await this.hooks.afterPush?.promise(this)
  }
}

module.exports = PushCore
