/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { readPrInputs, getRepoDetatils, createPrMutation, getPrBody } = require('./util')
const { appConfig } = require('../../utils/appconfigStore')
const { configstore } = require('../../configstore')
const { spinnies } = require('../../loader')

/* eslint-disable no-console */

const pr = async (name) => {
  let prRequest = ''
  try {
    await appConfig.init()

    const blockDetails = appConfig.getBlock(name)

    if (!blockDetails?.meta) {
      throw new Error(`${name} block does not exist`)
    }

    const gitUser = configstore.get('githubUserName')

    const repoDetails = await getRepoDetatils(`${gitUser}/${name}`)

    if (!repoDetails.fork) {
      throw new Error(`${name} block is not a forked repo`)
    }

    const userInputs = await readPrInputs(gitUser)

    const body = await getPrBody()

    prRequest = `${userInputs.headRefName} -> ${repoDetails.parent.full_name}:${userInputs.baseRefName}`

    spinnies.add('pr', { text: `Creating pull request for ${prRequest}` })

    const createdPr = await createPrMutation({ ...userInputs, body, repositoryId: repoDetails.parent.node_id })

    spinnies.succeed('pr', { text: `Created pull request url ${createdPr.url}` })
  } catch (e) {
    spinnies.add('pr')
    spinnies.fail('pr', { text: `Failed to created pull request : ${prRequest}` })
    console.log(chalk.red(e.message || e))
  }
}

module.exports = pr
