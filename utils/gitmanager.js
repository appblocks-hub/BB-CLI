/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { exec } = require('child_process')
const { configstore } = require('../configstore')
const { GitError } = require('./errors/gitError')

/**
 * @typedef pexecResolveObject
 * @type {Object}
 * @property {("success" | "error")} status Status of command execution
 * @property {String} msg Message from stdout or stderr
 */

/**
 * To promisify exec
 * @param {String} cmd Command to execute
 * @param {Object} options Options object to pass to exec
 * @returns {Promise<pexecResolveObject>}
 */
function pexec(cmd, options) {
  return new Promise((resolve) => {
    exec(cmd, options, (error, stdout, stderr) => {
      // console.log('stdout', stdout)
      // console.log()
      // console.log('stderr', stderr)
      // console.log()
      // console.log('error', error)
      if (error) {
        resolve({ status: 'error', msg: stdout.toString() || stderr.toString() })
      }
      resolve({ status: 'success', msg: stdout.toString() || stderr.toString() })
    })
  })
}

class GitManager {
  /**
   *
   * @param {String} cwd The directory path where the command is to be run
   * @param {String} reponame Name of repo
   * @param {String} url Source url (git repo https or ssh id if ssh is true)
   * @param {Boolean} ssh If passed url is ssh, then true else false
   */
  constructor(cwd, reponame, url, ssh) {
    // console.log(cwd, reponame, url, ssh)
    this.cwd = cwd
    this.ssh = ssh || false
    this.source = `${url}.git`
    this.username = configstore.get('githubUserName')
    this.repository = reponame
    // this.token = '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:x-oauth-basic@github.com'
    this.token = configstore.get('gitPersonalAccessToken')
    this.remote = `https://${this.token}/${this.username}/${this.repository}.git`
    this._createRemote(url, ssh)
    // console.log(`${this.remote}is set as remote`)
  }

  /**
   * Selects and sets remote url from block meta data
   * based on  preffered choice of ssh or https
   * @param {String} url
   */
  _createRemote(url, ssh) {
    this.remote = ssh ? url : url.replace('//github.com', `//${this.token}:x-oauth-basic@github.com`)
  }

  /* ********************************
   *************** A ****************
   ******************************** */

  addRemote(remoteName, parentRepo) {
    return this._run('remote', ['add', remoteName, parentRepo])
  }

  /* ********************************
   *************** C ****************
   ******************************** */

  commit(message, ...opts) {
    return this._run('commit', ['-m', `"${message}"`, ...opts])
  }

  clone(destination) {
    return this._run('clone', [this.remote, destination])
  }

  checkoutbranch(name) {
    return this._run('checkout', [name])
  }

  cd(directoryPath) {
    this.cwd = directoryPath
  }

  /* ********************************
   *************** F ****************
   ******************************** */

  fetch(from) {
    return this._run('fetch', [from])
  }

  /* ********************************
   *************** G ****************
   ******************************** */

  getGobalUsername() {
    return this._run('config', ['--global', 'user.name'])
  }

  /* ********************************
   *************** M ****************
   ******************************** */

  merge(from, ...opts) {
    return this._run('merge', [from, ...opts])
  }

  /* ********************************
   *************** N ****************
   ******************************** */

  /**
   *
   * @param {String} branchname Name of new branch
   * @returns {Promise<pexecResolveObject>}
   */
  newBranch(branchname) {
    return this._run('checkout', ['-b', branchname])
  }

  /* ********************************
   *************** P ****************
   ******************************** */

  pull() {
    this._run('pull', [this.remote])
  }

  push(upstreamBranch) {
    return this._run('push', [this.remote], upstreamBranch || 'main')
  }

  pushTags() {
    return this._run('push', [this.remote], '--tags')
  }

  /* ********************************
   *************** R ****************
   ******************************** */

  removeRemote(remoteName) {
    return this._run('remote', ['rm', remoteName])
  }

  /* ********************************
   *************** S ****************
   ******************************** */

  stageAll() {
    return this._run('add', ['-A'])
  }

  status() {
    return this._run('status', [])
  }

  setLocalUsername(name) {
    return this._run('config', ['--local', 'user.name', name])
  }

  setGlobalUsername(name) {
    return this._run('config', ['--global', 'user.name', name])
  }

  setLocalUseremail(email) {
    return this._run('config', ['--local', 'user.email', email])
  }

  setGlobalUseremail(email) {
    return this._run('config', ['--global', 'user.email', email])
  }

  async _run(operation, opts) {
    const r = await pexec(`git ${operation} ${opts.join(' ')}`, { cwd: this.cwd })
    // console.log(r)
    if (r.status === 'error') {
      // resetHead should be based on performed operation..dont always pass false
      throw new GitError(this.cwd, r.msg, false, operation, opts)
    }
    return r
    // git.on('close', (c) => console.log('In close', c))
    // git.on('error', (err) => console.log('In error', err))
    // git.on('exit', (c) => console.log('In exit', c))
    // git.stdout.on('data', (d) => console.log('In data stdout', d.toString()))
    // git.stderr.on('data', (d) => console.log('In stderr', d.toString()))
  }
}

module.exports = { GitManager }
