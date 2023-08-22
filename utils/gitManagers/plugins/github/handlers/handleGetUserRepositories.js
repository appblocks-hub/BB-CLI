const { PaginateQuery } = require('../../../utils/graphql/paginateQuery')
const { githubGraphQl } = require('../auth/githubAPI')
const { getGithubHeader } = require('../auth/githubHeaders')
const { userRepos } = require('../graphQl/queries')

const handleGetUserRepositories = async (options) => {
  const { source } = options
  if (source) {
    const variables = {
      // always pass owner and username also, graph doesn't mind
      // user: configstore.get('githubUserName') || null,
      // login: arguments[4] || null,
    }
    return new PaginateQuery(githubGraphQl, getGithubHeader, userRepos.Q, userRepos.Tr_t, variables).sourceAll
  }

  return []
}

module.exports = handleGetUserRepositories
