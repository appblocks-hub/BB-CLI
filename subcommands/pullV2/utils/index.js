/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { path } = require('@babel/traverse/lib/cache')
const { spinnies } = require('../../../loader')
const { GitManager } = require('../../../utils/gitManagerV2')

const cloneBlock = async ({ block_name, git_url, rootPath }) => {
  spinnies.add(block_name, { text: `Pulling ${block_name}` })
  const Git = new GitManager(rootPath, git_url)
  const cloneFolder = path.join(rootPath, block_name)
  await Git.clone(cloneFolder)
  spinnies.succeed(block_name, { text: `Pulled ${block_name} ` })

  return { cloneFolder }
}

module.exports = { cloneBlock }
