/* eslint-disable class-methods-use-this */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const { configstore } = require('../../../../configstore')
const { axios } = require('../../../axiosInstances')
const GitManager = require('../../gitManager')
const { githubGraphQl } = require('./auth/githubAPI')
const { getGitHeader } = require('./auth/githubHeaders')
const handleAuth = require('./auth/handleAuth')
const { userRepos, isRepoNameAvailable } = require('./graphQl/queries')
const { convertGithubUrl, getGithubRemote } = require('./utils')
const { NewLS } = require('../../utils/graphql/listandselectrepos')
const GitPaginator = require('./utils/paginateGitRest')

class GithubManager extends GitManager {
  /**
   *
   * @param {*} config
   */
  constructor(config) {
    const { cwd, gitUrl, prefersSsh, gitVendor } = config

    const sshUrl = gitUrl ? convertGithubUrl(gitUrl, 'ssh') : null
    const githubUserToken = configstore.get('githubUserToken')
    const remote = getGithubRemote(prefersSsh, sshUrl, githubUserToken)

    super({ gitVendor, remote, cwd })

    this.cwd = cwd
    this.remote = remote
    this.gitVendor = gitVendor
    this.prefersSsh = prefersSsh
    this.githubUserToken = githubUserToken
    this.githubUserId = configstore.get('githubUserId')
    this.githubUserName = configstore.get('githubUserName')
    this.localGitUserName = configstore.get('localGitUserName')
    this.localGitUserEmail = configstore.get('localGitUserEmail')

    this.isGithubManager = true
  }

  // Auth
  /**
   *
   * @param {*} options
   */
  async login(options) {
    await handleAuth(options)
  }

  // Queries
  async getOrganizations() {
    return new GitPaginator('user/orgs', (v) => ({
      name: v.login,
      // split("/") -- To get name of org so it can be used
      // to get team list of organization in later prompt,
      // TODO -- if possible change choice object of inquirer to accommodate this,
      // and return ans with name and not just answer
      value: `${v.login}/${v.node_id}`,
    }))
  }

  async getRepositories() {
    return new NewLS(userRepos.Q, userRepos.Tr_t).sourceAll
  }

  // async getRepository() {}

  async checkRepositoryNameAvailability() {
    return axios
      .post(
        githubGraphQl,
        {
          query: isRepoNameAvailable.Q,
          variables: {
            user: configstore.get('githubUserName'),
            search: this.newNameToTry,
          },
        },
        { headers: getGitHeader() }
      )
      .then((data) => isRepoNameAvailable.Tr(data))
      .catch((err) => {
        console.log(err)
        return false
      })
  }

  // // Mutations

  // async createRepository() {}

  // async updateRepository() {}

  // async cloneRepository() {}

  // async createPullRequest() {}
}

module.exports = GithubManager
