/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { default: axios } = require('axios')
const { rmSync } = require('fs')
const path = require('path')
const { configstore } = require('../../configstore')
const { spinnies } = require('../../loader')
const { deleteBlock, githubRestOrigin, githubOrigin } = require('../../utils/api')
const { post } = require('../../utils/axios')
const { getGitRestHeaders } = require('../../utils/getHeaders')

const deleteRegestredBlock = async (blockNames) => {
  const { data, error } = await post(deleteBlock, { block_names: blockNames })

  if (error) throw error

  return data
}

const deleteGithubRepo = async (gitUser, blockName) => {
  const userRepo = `${gitUser}/${blockName}`
  const gitRepoUrl = `${githubOrigin}/${userRepo}`
  const spinniesId = `del${blockName}`
  spinnies.add(spinniesId)
  try {
    spinnies.update(spinniesId, { text: `Deleting block repository ${blockName}` })

    const res = await axios.delete(`${githubRestOrigin}/repos/${userRepo}`, { headers: getGitRestHeaders() })

    spinnies.succeed(spinniesId, { text: `Deleted block repository ${userRepo}` })

    return { data: res.data }
  } catch (error) {
    if (error.response?.status === 404) {
      spinnies.fail(spinniesId, { text: `No repository found for ${gitRepoUrl}` })
    } else {
      spinnies.fail(spinniesId, {
        text: `Error deleting github repo ${gitRepoUrl}. Please delete manually`,
      })
    }
    return { err: error }
  }
}

const deleteGithubRepos = async (blockNames) => {
  const gitUser = configstore.get('githubUserName')
  await Promise.allSettled(
    blockNames.map(async (blockName) => {
      const { err, data } = await deleteGithubRepo(gitUser, blockName)
      if (err) throw err.message || err
      return data
    })
  ).then((values) => {
    const { success, failed } = values.reduce(
      (acc, v) => {
        // console.log(v)
        if (v.status === 'rejected') {
          return { ...acc, failed: acc.failed + 1 }
        }
        return { ...acc, success: acc.success + 1 }
      },
      { success: 0, failed: 0 }
    )

    spinnies.add('del')
    if (success > 0) spinnies.succeed('del', { text: `${success} blocks deleted successfully,` })
    if (failed > 0) spinnies.fail('del', { text: `${failed} blocks failed to delete..` })
  })
}

const removeConfigAndFolder = async (appConfig, deleteBlocks, appBlockName) => {
  let error
  await Promise.allSettled(
    deleteBlocks.map(async (bName) => {
      const blockData = appConfig.getBlock(bName)

      let rmPath = path.join(path.resolve(), bName)
      if (blockData?.packagedBlock) {
        const rootPath = appConfig.lrManager.localRegistry[blockData.packagedBlock]?.rootPath
        rmPath = path.join(rootPath, blockData.directory)
      } else if (blockData?.directory) {
        rmPath = path.join(path.resolve(), blockData.directory)
      } else if (appBlockName === bName) {
        rmPath = path.resolve()
      }

      rmSync(rmPath, { recursive: true, force: true })
      appConfig.removeBlock(bName)

      return true
    })
  ).then((v) => {
    // console.log(v);
    error = v.some((e) => e.status === 'rejected')
  })

  if (error) {
    throw new Error('Error removing block folder. Please remove manually')
  }

  return true
}

module.exports = { deleteRegestredBlock, deleteGithubRepos, removeConfigAndFolder }
