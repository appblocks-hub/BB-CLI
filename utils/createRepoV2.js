/* eslint-disable no-unused-expressions */

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const inquirer = require('inquirer')
const axios = require('axios')
const { createRepository } = require('./Mutations')
const { githubGraphQl } = require('./api')
const { getGitHeader } = require('./getHeaders')
const { spinnies } = require('../loader')
const { CreateRepoError } = require('./errors/createRepoError')

/**
 * @param {Boolean} muted
 * @param {String} ownerId User id
 * @param {String} blockShortName Name of block to try to create with
 */
async function createRepo(muted, ownerId, blockShortName) {
  const questions = [
    {
      type: 'list',
      name: 'visibility',
      message: 'visibility of repo',
      choices: ['PRIVATE', 'PUBLIC'],
    },
  ]

  const ans = await inquirer.prompt(questions)

  const headersV4 = getGitHeader()
  !muted && spinnies.add('createrepo', { text: `Creating ${blockShortName}` })
  const { data } = await axios.post(
    githubGraphQl,
    {
      query: createRepository.Q,
      variables: {
        name: blockShortName,
        owner: ownerId,
        templateRepo: null,
        template: false,
        description: '',
        visibility: ans.visibility,
        team: null,
      },
    },
    { headers: headersV4 }
  )
  if (data.errors) {
    if (data.errors.length === 1 && data.errors[0].type === 'UNPROCESSABLE') {
      spinnies.fail('createRepo', { text: `Repo name ${blockShortName} already exists` })
      spinnies.remove('createRepo')
      throw new CreateRepoError('', 0)
    }
    !muted && spinnies.fail('createrepo', { text: `Something went wrong!` })
    throw new CreateRepoError('', 1)
  }
  !muted && spinnies.succeed('createrepo', { text: `Created repo ${blockShortName}` })
  const blockFinalName = blockShortName
  return { blockFinalName, ...createRepository.Tr(data) }
}

module.exports = { createRepo: createRepo.bind(null, false), createRepoMuted: createRepo.bind(null, true) }
