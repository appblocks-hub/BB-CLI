/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable no-async-promise-executor */

const inquirer = require('inquirer')
const { configstore } = require('../../../configstore')
const { githubOrigin,  } = require('../../../utils/api')
const checkBlockNameAvailability = require('../../../utils/checkBlockNameAvailability')
const { getOrgId } = require('../../../utils/questionPromptsV2')
const { spinnies } = require('../../../loader')
const convertGitUrl = require('../../../utils/convertGitUrl')

/**
 *
 * @param {String} forkGitUrl
 * @returns {String}
 */
const getUserRepoName = (forkGitUrl) =>
  forkGitUrl.includes(githubOrigin)
    ? forkGitUrl.replace(`${githubOrigin}/`, '')
    : forkGitUrl.replace('git@github.com:', '').replace('.git', '')

/**
 *
 * @param {String} userRepo
 * @param {String} newBlockName
 * @returns {Object | String}
 */
const forkRepoPost = async (userRepo, newBlockName, organization, branchType, gitManager) => {
  try {
    const requestData = {
      name: newBlockName,
      default_branch_only: branchType,
    }

    if (organization != null) {
      requestData.organization = organization
    }

    const res = await gitManager.forkRepository({ userRepo, requestData })
    return { data: res.data, blockFinalName: newBlockName }
  } catch (err) {
    if (err.response.status === 404) {
      throw new Error('Repo not found Or Trying to fork private repo')
    } else if (err.response.type === 'UNPROCESSABLE') {
      const newShortName = await checkBlockNameAvailability('', true)
      return forkRepoPost(userRepo, newShortName, organization)
    } else throw new Error(err.response.data.message)
  }
}

/**
 * @returns {Object}
 */
const readRepoInputs = async () => {
  const question = [
    {
      type: 'list',
      message: 'where to fork repo',
      name: 'gitType',
      choices: ['my git', 'org git'],
    },
    {
      type: 'confirm',
      message: 'Fork default branch only',
      name: 'defaultBranchOnly',
      default: true,
    },
    // {
    //   type: 'input',
    //   name: 'description',
    //   message: 'Description of repo',
    // },
    // {
    //   type: 'list',
    //   name: 'visibility',
    //   message: 'visibility of repo',
    //   choices: ['PRIVATE', 'PUBLIC'],
    // },
  ]

  const promtRes = await inquirer.prompt(question)
  return promtRes
}

/**
 *
 * @returns {Object}
 */
const getRepoInputs = async () => {
  const repoInputs = await readRepoInputs()
  if (repoInputs.gitType === 'my git') {
    const userName = configstore.get('githubUserName')
    const userId = configstore.get('githubUserId')
    return {
      ...repoInputs,
      userName,
      userId,
    }
  }

  const [orgName, orgId] = await getOrgId()
  return { ...repoInputs, orgId, orgName }
}

/**
 *
 * @param {Object} metaData
 * @param {String} newBlockName
 * @param {String} clonePath
 * @returns {Object | String}
 */
const forkRepo = (metaData) =>
  new Promise(async (resolve, reject) => {
    try {
      const { GitUrl: forkGitUrl } = metaData

      const userInputs = await getRepoInputs()
      const userRepo = getUserRepoName(forkGitUrl)
      spinnies.add('fork', { text: `Forking the repository` })

      const { orgName, userName, defaultBranchOnly } = userInputs

      const {
        data: { description, visibility, svn_url: url, ssh_url, name },
        blockFinalName,
      } = await forkRepoPost(userRepo, metaData.block_name, orgName, defaultBranchOnly)

      const sshUrl = convertGitUrl(ssh_url, 'ssh')

      if (name !== blockFinalName) {
        throw new Error(`Fork already exists as ${orgName || userName}/${name}`)
      }

      spinnies.succeed('fork', { text: `Successfully forked` })
      resolve({ description, visibility, url, sshUrl, name, blockFinalName })
    } catch (err) {
      spinnies.add('fork')
      spinnies.fail('fork', { text: `Failed to fork` })
      reject(err)
    }
  })

module.exports = { forkRepo }
