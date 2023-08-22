const { axios } = require('../../../../axiosInstances')
const { githubGraphQl } = require('../auth/githubAPI')
const { getGithubHeader } = require('../auth/githubHeaders')
const { getRepoDetails } = require('../graphQl/queries')

const handleGetRepository = async (options, config) => {
  const { repoName, ownerName } = config
  const existingRepoRes = await axios.post(
    githubGraphQl,
    {
      query: getRepoDetails.Q,
      variables: { owner: ownerName, name: repoName },
    },
    { headers: getGithubHeader() }
  )

  return getRepoDetails.Tr(existingRepoRes)
}

module.exports = handleGetRepository
