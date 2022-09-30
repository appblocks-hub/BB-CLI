/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable no-async-promise-executor */

const { default: axios } = require('axios')
const { readFileSync, writeFileSync } = require('fs')
const inquirer = require('inquirer')
const path = require('path')
const { configstore } = require('../../configstore')
const { githubOrigin, githubRestOrigin, githubGraphQl } = require('../../utils/api')
const { blockTypeInverter } = require('../../utils/blockTypeInverter')
const checkBlockNameAvailability = require('../../utils/checkBlockNameAvailability')
const { getGitHeader } = require('../../utils/getHeaders')
const { GitManager } = require('../../utils/gitmanager')
const { updateRepository } = require('../../utils/Mutations')
const { getOrgId } = require('../../utils/questionPrompts')
const registerBlock = require('../../utils/registerBlock')
const { spinnies } = require('../../loader')

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
const forkRepoPost = async (userRepo, newBlockName, organization, branchType) => {
  try {
    const postData = {
      name: newBlockName,
      default_branch_only: branchType,
    }

    if (organization != null) {
      postData.organization = organization
    }

    const res = await axios.post(`${githubRestOrigin}/repos/${userRepo}/forks`, postData, { headers: getGitHeader() })
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
 * @param {Object} ans
 * @returns
 */
const updateRepo = async (ans) => {
  const { data: innerData } = await axios.post(
    githubGraphQl,
    {
      query: updateRepository.Q,
      variables: {
        description: ans.description,
        visibility: ans.visibility,
        team: ans.selectTeam || null,
      },
    },
    { headers: getGitHeader() }
  )
  if (innerData.errors) {
    throw new Error(`Something went wrong with query, \n${JSON.stringify(innerData)}`)
  }

  return innerData
}

/**
 *
 * @param {Object} options
 */
const pullForkedRepo = async (options) => {
  const { clonePath, sshUrl, url, name } = options
  spinnies.update('fork', { text: `Pulling forked repo ${name}` })

  const repoUrl = configstore.get('prefersSsh') ? sshUrl : url
  const git = new GitManager('.', name, repoUrl, configstore.get('prefersSsh'))
  await git.clone(`${clonePath}/${name}`)

  spinnies.update('fork', { text: `Pulled forked repo ${name}` })

  return true
}

/**
 * NOTE : CREATE A COMMON FUNCTION FOR UPDATE BLCOK CONFIG
 * @param {Object} options
 */
const updateBlockConfig = async (options) => {
  spinnies.update('fork', { text: `Updating block config` })
  const { clonePath, cloneDirName, blockType, blockFinalName, url, sshUrl } = options
  let blockConfig
  try {
    blockConfig = JSON.parse(readFileSync(path.resolve(clonePath, cloneDirName, 'block.config.json')))
  } catch (err) {
    const type = blockTypeInverter(blockType)
    const isViewType = [2, 3].includes(blockType)

    if (err.code === 'ENOENT') {
      blockConfig = {
        type,
        language: isViewType ? 'js' : 'nodejs',
        start: isViewType ? 'npx webpack-dev-server' : 'node index.js',
        build: isViewType ? 'npx webpack' : '',
        postPull: 'npm i',
      }
    }
  }
  blockConfig.name = blockFinalName
  blockConfig.source = { https: url, ssh: sshUrl }
  blockConfig.isFork = true
  writeFileSync(path.resolve(clonePath, cloneDirName, 'block.config.json'), JSON.stringify(blockConfig))
  spinnies.update('fork', { text: `Updated block config` })
  return true
}

/**
 *
 * @param {Object} metaData
 * @param {String} newBlockName
 * @param {String} clonePath
 * @returns {Object | String}
 */
const forkRepo = (metaData, newBlockName, clonePath) =>
  new Promise(async (resolve, reject) => {
    try {
      const { GitUrl: forkGitUrl, BlockType } = metaData

      const userInputs = await getRepoInputs()
      const userRepo = getUserRepoName(forkGitUrl)
      spinnies.add('fork', { text: `Forking the repository` })

      const { orgName, userName, defaultBranchOnly } = userInputs

      const {
        data: { description, visibility, svn_url: url, ssh_url: sshUrl, name },
        blockFinalName,
      } = await forkRepoPost(userRepo, newBlockName, orgName, defaultBranchOnly)

      if (name !== blockFinalName) {
        throw new Error(`Fork already exists as ${orgName || userName}/${name}`)
      }

      spinnies.update('fork', { text: `Repository forked successfully` })

      // TODO : update repo description & visibility
      // const updatedRepoData = updateRepo(userInputs)

      await pullForkedRepo({ clonePath, sshUrl, url, name })
      await updateBlockConfig({
        clonePath,
        cloneDirName: name,
        sshUrl,
        url,
        name,
        blockFinalName,
        blockType: BlockType,
      })

      spinnies.update('fork', { text: `Registering block` })
      await registerBlock(BlockType, name, name, visibility === 'PUBLIC', sshUrl, description)
      spinnies.update('fork', { text: `Registered block` })

      spinnies.succeed('fork', { text: `Successfully forked` })
      resolve({ description, visibility, url, sshUrl, name, blockFinalName })
    } catch (err) {
      spinnies.fail('fork', { text: `Failed to fork` })
      reject(err)
    }
  })

module.exports = { forkRepo, updateRepo }
