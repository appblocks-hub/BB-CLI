/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { BlockPusher } = require('./blockPusher')
const { multibar } = require('./multibar')

/**
 *
 * @param {String} gitUserName Git username to add to local config
 * @param {String} gitUserEmail Git email to add to local config
 * @param {String} commitMessage Commit message to use while committing
 * @param {Array} blocksToPush Array with block meta data
 */
function pushBlocks(gitUserName, gitUserEmail, commitMessage, blocksToPush) {
  return new Promise((res, rej) => {
    try {
      const pushReport = {}
      // If empty array is given throw
      if (blocksToPush.length === 0) rej(new Error('No blocks provided to push').message)

      const promises = []
      blocksToPush.forEach((v) => {
        promises.push(
          new BlockPusher(v, multibar).push({
            gitUserEmail,
            gitUserName,
            commitMessage,
          })
        )
      })

      Promise.allSettled([...promises]).then((values) => {
        setTimeout(() => {
          const { success, failed } = values.reduce(
            (acc, v) => {
              // console.log(v)
              if (v.status === 'rejected') {
                pushReport[v.reason.name] = v.reason.data.message
                return { ...acc, failed: acc.failed + 1 }
              }
              return { ...acc, success: acc.success + 1 }
            },
            { success: 0, failed: 0 }
          )

          console.log('\n')
          console.log(`${success} blocks pushed successfully,`)
          console.log(`${failed} blocks failed to push..`)
          console.log('Check pushlogs for error details')

          console.log(pushReport)
          res('Completed push')
        }, 300)
      })
    } catch (err) {
      console.log(`Something went terribly wrong,\n${err}`)
    }
  })
}

module.exports = { pushBlocks }
