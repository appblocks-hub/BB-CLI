#!usr/bin/env node

const { Command } = require('commander')
const { getGitHeader } = require('../utils/getHeaders')
const { isRepoNameAvailable } = require('../utils/Queries')
const { axios } = require('../utils/axiosInstances')
const { githubGraphQl } = require('../utils/api')
const { configstore } = require('../configstore')

const program = new Command().hook('preAction', async () => {})

program.argument('<name>', 'Name of block to start').action(test)

program.parse(process.argv)

async function test(name) {
  const data = await axios.post(
    githubGraphQl,
    {
      query: isRepoNameAvailable.Q,
      variables: {
        user: configstore.get('githubUserName'),
        search: name,
      },
    },
    { headers: getGitHeader() }
  )
  return isRepoNameAvailable.Tr(data)
}

/**
 * A better strategy for automatically naming blocks
 * a command to generate headless config json - create the file only if user needs it - 4Hr
 * Update all prompt questions to return answer from headless config, if a flag to avoid propmt is set - 4Hrs
 *
 */
