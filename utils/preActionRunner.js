/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { ensureUserLogins } = require('./ensureUserLogins')
const { isInGitRepository, isGitInstalled } = require('./gitCheckUtils')
const { checkLogDirs } = require('./preActionMethods/preAction-start')

const preActionChecks = async (subcommand) => {
  switch (subcommand) {
    // To add command specific checks
    case 'start':
      // TODO: check node version
      checkLogDirs()

      break

    case 'stop':
      break

    case 'sync':
      if (!isGitInstalled()) {
        console.log('Git not installed')
        process.exit(1)
      }
      await ensureUserLogins()
      break

    case 'ls':
      break

    case 'exec':
      break

    case 'mark':
      await ensureUserLogins()
      break

    case 'push':
      if (!isGitInstalled()) {
        console.log('Git not installed')
        process.exit(1)
      }
      await ensureUserLogins()
      break

    case 'pull':
      if (!isGitInstalled()) {
        console.log('Git not installed')
        process.exit(1)
      }
      await ensureUserLogins()
      break

    case 'push-config':
      await ensureUserLogins()
      break

    case 'add-tags':
      await ensureUserLogins()
      break

    case 'flush':
      break

    case 'pull_appblock':
      if (!isGitInstalled()) {
        console.log('Git not installed')
        process.exit(1)
      }
      await ensureUserLogins()
      break

    case 'create':
      if (!isGitInstalled()) {
        console.log('Git not installed')
        process.exit(1)
      }
      await ensureUserLogins()
      break

    case 'log':
      break

    case 'init':
      if (!isGitInstalled()) {
        console.log('Git not installed')
        process.exit(1)
      }
      if (isInGitRepository()) {
        console.log('Already in a Git repository')
        process.exit(1)
      }
      await ensureUserLogins()
      break

    case 'connect':
      if (!isGitInstalled()) {
        console.log('Git not installed')
        process.exit(1)
      }
      break

    case 'login':
      break

    default:
      break
  }
}

module.exports = {
  preActionChecks,
}
