const { axios } = require('../../../../axiosInstances')
const { githubGraphQl } = require('../auth/githubAPI')
const { getGithubHeader } = require('../auth/githubHeaders')
const { createRepository } = require('../graphQl/mutations')

const handleCloneRepository = async (options) => {
  const { repoName, description, visibility, ownerId } = options
  await axios.post(
    githubGraphQl,
    {
      query: createRepository.Q,
      variables: {
        name: repoName.toString(),
        owner: ownerId,
        templateRepo: null,
        template: false,
        description,
        visibility,
        team: null,
      },
    },
    { headers: getGithubHeader() }
  )
}

module.exports = handleCloneRepository
