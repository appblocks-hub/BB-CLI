const GithubPaginator = require('../utils/paginateGithubRest')

const handleGetUserOrganizations = async (options) => {
  const { source } = options

  if (source) {
    return new GithubPaginator('user/orgs', (v) => ({
      name: v.login,
      // split("/") -- To get name of org so it can be used
      // to get team list of organization in later prompt,
      // TODO -- if possible change choice object of inquirer to accommodate this,
      // and return ans with name and not just answer
      value: `${v.login}/${v.node_id}`,
    }))
  }

  return []
}

module.exports = handleGetUserOrganizations
