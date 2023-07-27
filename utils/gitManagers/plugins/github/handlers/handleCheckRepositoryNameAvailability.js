const { axios } = require('../../../../axiosInstances')
const { githubGraphQl } = require('../auth/githubAPI')
const { getGithubHeader } = require('../auth/githubHeaders')
const { isRepoNameAvailable } = require('../graphQl/queries')

const handleCheckRepositoryNameAvailability = async (options, config) => {
  const { repositoryName } = options
  const gRes = await axios.post(
    githubGraphQl,
    {
      query: isRepoNameAvailable.Q,
      variables: {
        user: config.userName,
        search: repositoryName,
      },
    },
    { headers: getGithubHeader() }
  )

  return isRepoNameAvailable.Tr(gRes)
}
module.exports = handleCheckRepositoryNameAvailability
