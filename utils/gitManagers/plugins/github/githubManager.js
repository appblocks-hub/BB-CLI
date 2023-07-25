/* eslint-disable class-methods-use-this */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const { configstore } = require('../../../../configstore')
const GitManager = require('../../gitManager')
const { convertGithubUrl, getGithubRemote } = require('./utils')
// handlers
const handleAuth = require('./auth/handleAuth')
const handleCreateRepository = require('./handlers/handleCreateRepository')
const handleCheckRepositoryNameAvailability = require('./handlers/handleCheckRepositoryNameAvailability')
const handleGetUserRepositories = require('./handlers/handleGetUserRepositories')
const handleGetUserOrganizations = require('./handlers/handleGetUserOrganizations')
const handleUpdateRepository = require('./handlers/handleUpdateRepository')
const handleCreatePullRequest = require('./handlers/handleCreatePullRequest')
const handleCloneRepository = require('./handlers/handleCloneRepository')
const handleGetRepository = require('./handlers/handleGetRepository')
const handleForkRepository = require('./handlers/handleForkRepository')

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

    const repoHttpsUrl = convertGithubUrl(gitUrl, 'http').replace('.git', '').split('/')
    const repoName = repoHttpsUrl[repoHttpsUrl.length - 1]
    const ownerName = repoHttpsUrl[repoHttpsUrl.length - 2]

    super({ gitVendor, remote, cwd })

    this.config = {}
    this.cwd = cwd
    this.remote = remote
    this.repoName = repoName
    this.ownerName = ownerName
    this.gitVendor = gitVendor
    this.prefersSsh = prefersSsh
    this.userToken = githubUserToken
    this.userId = configstore.get('githubUserId')
    this.userName = configstore.get('githubUserName')
    this.localGitUserName = configstore.get('localGitUserName')
    this.localGitUserEmail = configstore.get('localGitUserEmail')

    this.isGithubManager = true

    this._buildConfig()
  }

  _buildConfig() {
    this.config = {
      cwd: this.cwd,
      remote: this.remote,
      repoName: this.repoName,
      ownerName: this.ownerName,
      gitVendor: this.gitVendor,
      prefersSsh: this.prefersSsh,
      userToken: this.userToken,
      userId: this.userId,
      userName: this.userName,
      localGitUserName: this.localGitUserName,
      localGitUserEmail: this.localGitUserEmail,
    }
  }

  /**
   * ==============================================
   * =================== Auth =====================
   * ==============================================
   */

  async login(options) {
    await handleAuth(options, this.config)
  }

  /**
   * ==============================================
   * ================== Queries ===================
   * ==============================================
   */

  async getOrganizations(options) {
    await handleGetUserOrganizations(options, this.config)
  }

  async getRepositories(options) {
    await handleGetUserRepositories(options, this.config)
  }

  async getRepository(options) {
    await handleGetRepository(options, this.config)
  }

  async checkRepositoryNameAvailability(options) {
    await handleCheckRepositoryNameAvailability(options, this.config)
  }

  /**
   * ==============================================
   * ================= Mutations ==================
   * ==============================================
   */

  async createRepository(options) {
    await handleCreateRepository(options, this.config)
  }

  async updateRepository(options) {
    await handleUpdateRepository(options, this.config)
  }

  async cloneRepository(options) {
    await handleCloneRepository(options, this.config)
  }

  async createPullRequest(options) {
    await handleCreatePullRequest(options, this.config)
  }

  /**
   * ==============================================
   * ================= Rest ==================
   * ==============================================
   */
  async forkRepository(options) {
    await handleForkRepository(options, this.config)
  }
}

module.exports = GithubManager
