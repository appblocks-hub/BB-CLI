const { axios } = require('../../../../axiosInstances')
const { githubGraphQl } = require('../auth/githubAPI')
const { getGithubHeader } = require('../auth/githubHeaders')
const { updateRepository } = require('../graphQl/mutations')
const handleGetRepository = require('./handleGetRepository')

const handleUpdateRepository = async (options, config) => {
  const { repoId, updateFields } = options
  let repositoryID = repoId

  if (!repoId) {
    const existingRepoData = handleGetRepository(options, config)
    const { id } = existingRepoData
    repositoryID = id
  }

  const graphQlRes = await axios.post(
    githubGraphQl,
    {
      query: updateRepository.Q,
      variables: {
        repositoryId: repositoryID,
        ...updateFields,
      },
    },
    { headers: getGithubHeader() }
  )

  return updateRepository.Tr(graphQlRes)
}

module.exports = handleUpdateRepository
