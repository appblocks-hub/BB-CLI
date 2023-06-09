/* eslint-disable prefer-destructuring */
/* eslint-disable no-unused-expressions */

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { dim } = require('chalk')
const path = require('path')
const { createRepository } = require('./Mutations')
const { githubGraphQl } = require('./api')
const { getGitHeader } = require('./getHeaders')
const { CreateRepoError } = require('./errors/createRepoError')
const { axios } = require('./axiosInstances')
const {
  getGitRepoDescription,
  getGitTarget,
  getOrgId,
  getGitRepoVisibility,
  getBlockName,
} = require('./questionPrompts')
const { configstore, headLessConfigStore } = require('../configstore')

/**
 * @param {String}  originalRepoName originalRepoName to try to create repo with
 */
async function createRepo(originalRepoName) {
  let repoName = originalRepoName
  const headersV4 = getGitHeader()
  const inputs = {}
  // const SHOULD_RUN_WITHOUT_PROMPTS = process.env.BB_CLI_RUN_HEADLESS === 'true'
  const SHOULD_RUN_WITHOUT_PROMPTS = true
  global.HEADLESS_CONFIGS = headLessConfigStore.store

  inputs.gitTarget = SHOULD_RUN_WITHOUT_PROMPTS ? global.HEADLESS_CONFIGS.gitTarget : await getGitTarget()

  /**
   * Default target is 'my git'
   */
  inputs.ownerName = configstore.get('githubUserName')
  inputs.ownerId = configstore.get('githubUserId')

  if (inputs.gitTarget === 'org git') {
    const _r = await getOrgId()
    inputs.ownerName = _r[0]
    inputs.ownerId = _r[1]
  }
  inputs.description = SHOULD_RUN_WITHOUT_PROMPTS
    ? global.HEADLESS_CONFIGS.gitDescription
    : await getGitRepoDescription()
  inputs.visibility = SHOULD_RUN_WITHOUT_PROMPTS ? global.HEADLESS_CONFIGS.gitVisibility : await getGitRepoVisibility()

  let createRepoRes
  let newName = true
  while (newName) {
    const { data } = await axios.post(
      githubGraphQl,
      {
        query: createRepository.Q,
        variables: {
          name: repoName.toString(),
          owner: inputs.ownerId,
          templateRepo: null,
          template: false,
          description: inputs.description,
          visibility: inputs.visibility,
          team: null,
        },
      },
      { headers: headersV4 }
    )
    if (data.errors) {
      if (data.errors.length === 1 && data.errors[0].type === 'UNPROCESSABLE') {
        // throw new CreateRepoError(`Repository (${repoName}) already exists for ${inputs.ownerName} `, 0)
        console.log(dim(`Repository (${repoName}) already exists for ${inputs.ownerName} `))
        newName = true
        repoName = await getNewName(originalRepoName, repoName)
      } else {
        newName = false
        throw new CreateRepoError(data.errors, 1)
      }
    } else {
      createRepoRes = data
      newName = false
    }
  }

  return { blockFinalName: repoName, ...createRepository.Tr(createRepoRes) }
}

function prefixMyString(original, lastTried) {
  let i = 0
  if (original !== lastTried) i = parseInt(lastTried.split('_').pop(), 10)
  return `${original}_${i + 1}`
}

async function getNewName(originalBlockName, lastTriedName) {
  let newNameToTry
  let renameFn = prefixMyString
  if (process.env.BB_CLI_RUN_HEADLESS === 'true') {
    if (global.HEADLESS_CONFIGS) {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const ex = require(path.resolve(global.HEADLESS_CONFIGS.blockNamingStrategy))
      if (typeof ex === 'function') renameFn = ex
    }
    newNameToTry = renameFn(originalBlockName, lastTriedName)
  } else {
    newNameToTry = await getBlockName()
  }

  return newNameToTry
}

module.exports = { createRepo }
