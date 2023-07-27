/* eslint-disable class-methods-use-this */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { pExec } = require('..')
const { GitError } = require('../errors/gitError')
const { noMethodImplementedError } = require('./utils')

class GitManager {
  /**
   *
   * @param {import('./gitManager').GitManagerConfig} config
   */
  constructor(config) {
    const { gitVendor, remote, cwd } = config
    this.gitVendor = gitVendor
    this.remote = remote
    this.cwd = cwd
  }

  /**
   ================================================================================= 
   ====================Vendor specific git manager functions======================== 
   ================================================================================= 
   */

  connect() {
    noMethodImplementedError(this.gitVendor)
  }

  disconnect() {
    noMethodImplementedError(this.gitVendor)
  }

  getOrganizations() {
    noMethodImplementedError(this.gitVendor)
  }

  getRepositories() {
    noMethodImplementedError(this.gitVendor)
  }

  getRepository() {
    noMethodImplementedError(this.gitVendor)
  }

  checkRepositoryNameAvailability() {
    noMethodImplementedError(this.gitVendor)
  }

  createRepository() {
    noMethodImplementedError(this.gitVendor)
  }

  updateRepository() {
    noMethodImplementedError(this.gitVendor)
  }

  cloneRepository() {
    noMethodImplementedError(this.gitVendor)
  }

  createPullRequest() {
    noMethodImplementedError(this.gitVendor)
  }

  setConfig() {
    noMethodImplementedError(this.gitVendor)
  }

  deleteConfig() {
    noMethodImplementedError(this.gitVendor)
  }

  /**
   ================================================================================= 
   ==========================Local git manager functions============================ 
   ================================================================================= 
   */

  addRemote(remoteName, parentRepo) {
    return this._run('remote', ['add', remoteName, parentRepo])
  }

  commit(message, ...opts) {
    return this._run('commit', ['-m', `"${message}"`, ...opts])
  }

  clone(destination) {
    return this._run('clone', [this.remote, destination])
  }

  sparseClone(destination) {
    return this._run('clone --depth 1 --filter=blob:none --sparse ', [this.remote, destination])
  }

  sparseCheckout(cmd, optionsArray) {
    return this._run('sparse-checkout ', [cmd || 'init', optionsArray])
  }

  readTree() {
    return this._run('read-tree -mu HEAD', [])
  }

  init() {
    return this._run('init', [])
  }

  checkoutBranch(name) {
    return this._run('checkout', [name])
  }

  getCommits(branchName, n) {
    return this._run(`log --oneline -${n}`, [branchName || 'main'])
  }

  checkRemoteBranch(branchName) {
    return this._run(`ls-remote --heads ${this.remote} ${branchName}`, [])
  }

  async findDefaultBranch() {
    const result = await this._run(`remote show ${this.remote} | sed -n '/HEAD branch/s/.*: //p'`, [])
    return result.out?.trim()
  }

  checkoutTag(tag, branch = 'main') {
    return this._run('checkout', [`tags/${tag}`, `-b ${branch}`])
  }

  checkoutTagWithNoBranch(tag) {
    return this._run('checkout', [`${tag}`])
  }

  undoCheckout() {
    return this._run('checkout', ['-'])
  }

  cd(directoryPath) {
    this.cwd = path.resolve(directoryPath)
  }

  createReleaseBranch(releaseBranch, parentBranch) {
    return this._run('checkout', ['-b', releaseBranch, parentBranch])
  }

  fetch(fetchOptions) {
    return this._run('fetch', [fetchOptions])
  }

  getGlobalUsername() {
    return this._run('config', ['--global', 'user.name'])
  }

  merge(from, ...opts) {
    return this._run('merge', [from, ...opts])
  }

  /**
   *
   * @param {String} branchName Name of new branch
   * @returns {Promise<pExecResolveObject>}
   */
  newBranch(branchName) {
    return this._run('checkout', ['-b', branchName])
  }

  newOrphanBranch(branchName) {
    return this._run('checkout', ['--orphan', branchName])
  }

  /**
   *
   * @param {String} branchName Name of new branch
   * @returns {Promise<pExecResolveObject>}
   */
  renameBranch(branchName) {
    return this._run('branch', ['-M', branchName])
  }

  pull() {
    return this._run('pull', [this.remote])
  }

  pullBranch(upstreamBranch) {
    return this._run(`pull `, [this.remote, upstreamBranch || 'main'])
  }

  currentBranch() {
    return this._run('branch', [this.remote, '--show-current'])
  }

  diff() {
    return this._run('diff --name-only --staged', [])
  }

  push(upstreamBranch) {
    return this._run('push', [this.remote, upstreamBranch || 'main'])
  }

  pushTags() {
    return this._run('push', [this.remote, '--tags'])
  }

  addTag(tag, msg) {
    return this._run('tag', [`-a ${tag}`, `-m "${msg}"`])
  }

  removeRemote(remoteName) {
    return this._run('remote', ['rm', remoteName])
  }

  removeTags(tags) {
    return this._run('tag', ['-d', tags])
  }

  stageAll() {
    return this._run('add', ['-A'])
  }

  status() {
    return this._run('status', [])
  }

  statusWithOptions(...opts) {
    return this._run('status', [...opts])
  }

  setUpstreamAndPush(upstreamBranch) {
    return this._run('push -u', [this.remote, upstreamBranch || 'main'])
  }

  setLocalUsername(name) {
    return this._run('config', ['--local', 'user.name', name])
  }

  setGlobalUsername(name) {
    return this._run('config', ['--global', 'user.name', name])
  }

  setLocalUserEmail(email) {
    return this._run('config', ['--local', 'user.email', email])
  }

  setGlobalUserEmail(email) {
    return this._run('config', ['--global', 'user.email', email])
  }

  revListTag(tag) {
    return this._run('rev-list', ['--reverse', tag, '| git cherry-pick -n --stdin'])
  }

  // ============================================ //

  async _run(operation, opts) {
    const r = await pExec(`git ${operation} ${opts.join(' ')}`, { cwd: this.cwd })
    if (r.err != null) {
      throw new GitError(this.cwd, r.err, false, operation, opts)
    }
    return r
  }
}

module.exports = GitManager
