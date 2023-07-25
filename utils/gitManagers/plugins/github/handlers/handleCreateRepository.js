const { axios } = require('../../../../axiosInstances')
const { githubGraphQl } = require('../auth/githubAPI')
const { getGithubHeader } = require('../auth/githubHeaders')
const { createRepository } = require('../graphQl/mutations')

const handleCreateRepository = async (options) => {
  const { ownerId, ...createData } = options
  const gRes =  await axios.post(
    githubGraphQl,
    {
      query: createRepository.Q,
      variables: {
        ...createData,
        owner: ownerId,
        templateRepo: null,
        template: false,
        team: null,
      },
    },
    { headers: getGithubHeader() }
  )

  return createRepository.Tr(gRes)
}

module.exports = handleCreateRepository
