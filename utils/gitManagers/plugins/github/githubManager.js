/* eslint-disable class-methods-use-this */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const configstore = require('../../../../configstore')
const GitManager = require('../../gitManager')
const { convertGithubUrl, getGithubRemote } = require('./utils')

class GithubManager extends GitManager {
  /**
   *
   * @param {*} config
   */
  constructor(config) {
    const { cwd, gitUrl, prefersSsh, gitVendor } = config

    const ssh = convertGithubUrl(gitUrl, 'ssh')
    const githubUserToken = configstore.get('githubUserToken')
    const remote = getGithubRemote(prefersSsh, ssh, githubUserToken)

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
  login() {}

  // Queries
  getOrganizations() {}

  getRepositories() {}

  getRepository() {}

  checkRepositoryNameAvailability() {}

  // Mutations

  createRepository() {}

  updateRepository() {}

  cloneRepository() {}

  createPullRequest() {}
}

module.exports = GithubManager
