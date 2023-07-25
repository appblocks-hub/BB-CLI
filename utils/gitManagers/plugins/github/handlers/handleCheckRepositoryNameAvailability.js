const configstore = require('../../../../../configstore')
const { axios } = require('../../../../axiosInstances')
const { githubGraphQl } = require('../auth/githubAPI')
const { getGithubHeader } = require('../auth/githubHeaders')
const { isRepoNameAvailable } = require('../graphQl/queries')

const handleCheckRepositoryNameAvailability = (options) => {
  const { repositoryName } = options
  return axios
    .post(
      githubGraphQl,
      {
        query: isRepoNameAvailable.Q,
        variables: {
          user: configstore.get('githubUserName'),
          search: repositoryName,
        },
      },
      { headers: getGithubHeader() }
    )
    .then((data) => isRepoNameAvailable.Tr(data))
    .catch((err) => {
      console.log(err)
      return false
    })
}
module.exports = handleCheckRepositoryNameAvailability
