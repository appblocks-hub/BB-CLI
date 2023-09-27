/* eslint-disable class-methods-use-this */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const chalk = require('chalk')
const GitManager = require('../../gitManager')
const { configstore } = require('../../../../configstore')
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
const handleGetSignedInUser = require('./auth/handleGetSignedInUser')
const { GITHUB_KEYS } = require('./utils/constant')
const handleDisconnect = require('./auth/handleDisconnect')

class GithubManager extends GitManager {
  /**
   *
   * @param {*} config
   */
  constructor(config) {
    const { cwd, gitUrl, prefersSsh, gitVendor } = config

    let remote = ''
    let repoName = ''
    let ownerName = ''
    const githubUserPAT = configstore.get(GITHUB_KEYS.userPAT)

    if (gitUrl) {
      const sshUrl = gitUrl ? convertGithubUrl(gitUrl, 'ssh') : null
      remote = getGithubRemote(prefersSsh, sshUrl, githubUserPAT)

      const repoHttpsUrl = convertGithubUrl(gitUrl, 'http').replace('.git', '').split('/')
      repoName = repoHttpsUrl[repoHttpsUrl.length - 1]
      ownerName = repoHttpsUrl[repoHttpsUrl.length - 2]
    }

    super({ gitVendor, remote, cwd })

    this.config = {}
    this.cwd = cwd
    this.remote = remote
    this.repoName = repoName
    this.gitVendor = gitVendor
    this.prefersSsh = prefersSsh
    this.ownerName = ownerName || this.userName
    this.isGithubManager = true

    this._buildConfig()
  }

  _buildConfig() {
    this.userId = configstore.get(GITHUB_KEYS.userId)
    this.userName = configstore.get(GITHUB_KEYS.userName)
    this.localGitUserName = configstore.get(GITHUB_KEYS.localGitUserName)
    this.localGitUserEmail = configstore.get(GITHUB_KEYS.localGitUserEmail)
    this.userToken = configstore.get(GITHUB_KEYS.userToken)
    this.userPAT = configstore.get(GITHUB_KEYS.userPAT)

    this.config = {
      cwd: this.cwd,
      remote: this.remote,
      repoName: this.repoName,
      ownerName: this.ownerName,
      gitVendor: this.gitVendor,
      prefersSsh: this.prefersSsh,
      userToken: this.userToken,
      userId: this.userId,
      userPAT: this.userPAT,
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

  async connect(options) {
    await handleAuth(options, this.config)
    this._buildConfig()
  }

  async disconnect(options) {
    await handleDisconnect(options, this.config)
    this._buildConfig()
  }

  async getSignedInUser(options) {
    return handleGetSignedInUser(options, this.config)
  }

  /**
   * ==============================================
   * ================== Queries ===================
   * ==============================================
   */

  async getOrganizations(options) {
    return handleGetUserOrganizations(options, this.config)
  }

  async getRepositories(options) {
    return handleGetUserRepositories(options, this.config)
  }

  async getRepository(options) {
    return handleGetRepository(options, this.config)
  }

  async checkRepositoryNameAvailability(options) {
    return handleCheckRepositoryNameAvailability(options, this.config)
  }

  /**
   * ==============================================
   * ================= Mutations ==================
   * ==============================================
   */

  async createRepository(options) {
    return handleCreateRepository(options, this.config)
  }

  async updateRepository(options) {
    return handleUpdateRepository(options, this.config)
  }

  async cloneRepository(options) {
    return handleCloneRepository(options, this.config)
  }

  async createPullRequest(options) {
    return handleCreatePullRequest(options, this.config)
  }

  /**
   * ==============================================
   * =================== Rest =====================
   * ==============================================
   */
  async forkRepository(options) {
    return handleForkRepository(options, this.config)
  }

  /**
   * ==============================================
   * =================== Config =====================
   * ==============================================
   */
  setConfig(key, value) {
    const configKeyName = GITHUB_KEYS[key]
    if (!key || !configKeyName) throw new Error('Invalid config key')
    configstore.set(configKeyName, value)
    this._buildConfig()
  }

  deleteConfig(keys) {
    if (!keys?.length) return
    keys.forEach((key) => {
      const configKeyName = GITHUB_KEYS[key]
      if (!configKeyName) console.log(chalk.yellow(`${key} not found`))
      else configstore.delete(configKeyName)
    })
    this._buildConfig()
  }

  refreshConfig() {
    this._buildConfig()
  }
}

module.exports = GithubManager
