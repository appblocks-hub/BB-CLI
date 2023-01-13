/* eslint-disable prefer-promise-reject-errors */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { fork, execSync } = require('child_process')
const path = require('path')

class BlockPusher {
  constructor(block, bar) {
    this.blockMeta = block
    this.blockPath = block.directory
    this.blockName = block.meta.name
    this.blockSource = block.meta.source
    this.progress = bar.create(10, 0, {
      // TODO -- change this to a dynamic bar, so no need to give the length(10) here
      // it could be any number
      status: 'starting..',
      block: this.blockName,
    })
    this.report = { name: this.blockName, data: { message: '', type: '' } }
  }

  push(...args) {
    // console.log('push args', args)
    return new Promise((res, rej) => {
      this.child = fork(path.join(__dirname, 'blockPushProcess.js'), {})
      const payload = { block: this.blockName }
      this.child.on('message', ({ failed, message, errorCode }) => {
        this.report.data = { message, type: 'success' }
        if (!failed) {
          this.progress.increment(1, { status: message, ...payload })
          return
        }
        if (errorCode) {
          // in case push is failed, reset commit so user can re-run push again,
          // and the repo wont be clean at that time
          execSync('git reset HEAD~1', { cwd: this.blockPath })
        }
      })
      this.child.on('error', () => {
        // If forking failed, show a message to rerun
        this.report.data = {
          message: ` Failed to run push for ${chalk.whiteBright(this.blockName)}\nPlease run ${chalk.italic(
            `block push ${this.blockName}`
          )} manually.`,
        }
      })
      this.child.on('exit', (code) => {
        if (code === 1) {
          this.progress.update({ status: 'failed', ...payload })
          this.progress.stop()
          this.report.data.type = 'error'
          rej(this.report)
          return
        }
        if (code === 2) {
          this.progress.update(10, { status: 'warning', ...payload })
          this.progress.stop()
          this.report.data.type = 'warn'
          rej(this.report)
          return
        }
        this.progress.update(10, { status: 'success', ...payload })
        this.progress.stop()
        res(this.report)
      })
      // send a msg to start
      this.child.send({
        blockPath: this.blockPath,
        blockName: this.blockName,
        blockSource: this.blockSource,
        ...args[0],
      })
    })
  }
}

module.exports = { BlockPusher }
