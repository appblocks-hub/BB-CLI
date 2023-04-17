/* eslint-disable prefer-destructuring */
/* eslint-disable no-unused-expressions */

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { createRepository } = require('./Mutations')
const { githubGraphQl } = require('./api')
const { getGitHeader } = require('./getHeaders')
const { CreateRepoError } = require('./errors/createRepoError')
const { axios } = require('./axiosInstances')
const { getGitRepoDescription, getGitTarget, getOrgId, getGitRepoVisibility } = require('./questionPrompts')
const { configstore } = require('../configstore')

/**
 * @param {String}  reponame reponame to try to create repo with
 */
async function createRepo(reponame) {
  const headersV4 = getGitHeader()
  const inputs = {}
  const SHOULD_RUN_WITHOUT_PROMPTS = process.env.BB_CLI_RUN_HEADLESS === 'true'

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
  inputs.description = await getGitRepoDescription()
  inputs.visibility = await getGitRepoVisibility()

  const { data } = await axios.post(
    githubGraphQl,
    {
      query: createRepository.Q,
      variables: {
        name: reponame.toString(),
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
      throw new CreateRepoError(`Repository (${reponame}) already exists for ${inputs.ownerName} `, 0)
    }
    throw new CreateRepoError('', 1)
  }
  const blockFinalName = reponame
  return { blockFinalName, ...createRepository.Tr(data) }
}

module.exports = { createRepo }
