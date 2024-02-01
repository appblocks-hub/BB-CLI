/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { promisify } = require('util')
const { execSync, exec } = require('child_process')
const semver = require('semver')
const { readdirSync, statSync } = require('fs')
const path = require('path')
const { getGitConfigNameEmail } = require('./questionPrompts')
const { GitError } = require('./errors/gitError')

const execPromise = promisify(exec)

function isInGitRepository() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' })
    return true
  } catch (e) {
    return false
  }
}

function isGitInstalled() {
  try {
    execSync('git --version', { stdio: 'ignore' })
    return true
  } catch (e) {
    return false
  }
}

function tryGitInit() {
  try {
    execSync('git --version', { stdio: 'ignore' })
    if (isInGitRepository()) return true

    execSync('git init', { stdio: 'ignore' })

    return true
  } catch (e) {
    console.warn('Git repo not initialized', e)
    return false
  }
}

function getGitDirsIn(source) {
  if (typeof source === 'string') {
    try {
      // console.log(`cd ${source}`)
      execSync(`cd ${source}`)
      const files = readdirSync(source)
      // console.log(`Files in ${source}:\n${files}`)
      const res = files.reduce((acc, v) => {
        // console.log(v, 'is path')
        if (v === '.git') return acc
        const stat = statSync(path.resolve(source, v))
        // console.log(stat.isFile())
        if (stat.isDirectory()) {
          const childGitDirs = getGitDirsIn(path.resolve(source, v))
          // console.log(childGitDirs)
          try {
            // or use  git rev-parse --show-toplevel and check path are same
            const c = execSync(`cd ${path.resolve(source, v)} && git rev-parse --git-dir 2> /dev/null;`)
              .toString()
              .trim()
            // console.log(c)
            if (c === '.git') {
              // console.log('c is .git')
              return acc.concat(childGitDirs).concat(path.resolve(source, v))
            }
          } catch (err) {
            // console.log(`${path.resolve(source, v)} is not a git directory`)
            return acc.concat(childGitDirs)
          }
        }
        return acc
      }, [])
      return res
    } catch (err) {
      console.log('getGitDirs error', err)
      return []
    }
  } else {
    // or pass an array of dir paths..handle here
    try {
      const length = source.length()
      if (length === 0) throw new Error('No dirs provided')
    } catch (err) {
      console.log('lenth err', err)
      return []
    }
  }
  return []
}

function isGitRepo(dir) {
  return execSync(`cd ${dir} && git rev-parse --git-dir`).toString().trim().endsWith('.git')
}

function isClean(dir) {
  if (!isGitRepo(dir)) throw new Error('Not in a git repo')
  return execSync(`git status --porcelain`, { cwd: dir }).toString().trim() === ''
}

function isCleanBlock(dir, blockName) {
  if (!isGitRepo(dir)) throw new Error('Not in a git repo')
  const modifiedFiles = execSync(`git status --porcelain`, { cwd: dir })
    .toString()
    .trim()
    .split('\n')
    .filter((s) => s)

  // TODO: Find a better way to check un-pushed commits
  // execSync(`git fetch --all`, { cwd: dir })
  // const unPushedCommits = execSync(`git log origin/$(git symbolic-ref --short HEAD)..HEAD`, { cwd: dir }).toString().trim() !== ''
  // if (unPushedCommits) throw new Error(`${dir} has un-pushed commits`)

  if (modifiedFiles.length <= 0) return true
  if (blockName && !modifiedFiles.some((mF) => mF.includes(blockName))) return true

  const bName = path.basename(dir)
  const inPath = path.relative(path.resolve(), dir)
  throw new Error(`Error: ${bName} has non-staged changes${inPath ? ` in ${inPath}` : ''}. Please run bb push`)
}

function addTag(dir, tag, msg = ' ') {
  // execSync(`git tag -a ${tag} -m "${msg}"`, { cwd: dir })
  return execPromise(`git tag -a ${tag} -m "${msg}"`, {
    stdio: ['ignore'],
    cwd: dir,
  })
    .then((_) => !!_)
    .catch((err) => {
      throw new Error(`Error in creating tag -> ${err.message}`)
    })
}

function pushTags(dir) {
  // execSync(`git push origin --tags`, { cwd: dir, stdio: 'ignore' })
  return execPromise(`git push origin --tags`, { cwd: dir, stdio: 'ignore' })
    .then((_) => !!_)
    .catch((err) => {
      throw new Error(`Error in pushing tag -> ${err.message}`)
    })
}
function getTags(dir) {
  try {
    const s = execSync(`git tag`, { cwd: dir }).toString().trim().split('\n')
    return s
  } catch (err) {
    throw new Error(`Error in getting tags -> ${err.message}`)
  }
}

const listReleaseBranchVersions = (dir) => {
  try {
    const branches = execSync(`git branch`, { cwd: dir }).toString().trim().split('\n')
    return branches.map((branch) => branch.split('@')[1]).filter((b) => b)
  } catch (err) {
    throw new Error(`Error in getting tags -> ${err.message}`)
  }
}

function getLatestVersion(dir, repoType) {
  // eslint-disable-next-line no-useless-catch
  try {
    if (repoType === 'mono') {
      const releaseBranches = listReleaseBranchVersions(dir)
      return semver.rsort(releaseBranches)[0]
    }

    const tags = getTags(dir)
    return semver.rsort(tags)[0]
  } catch (error) {
    throw error
  }
}

function gitPushAllIn(dir) {
  return new Promise((res, rej) => {
    exec(`cd ${dir} && git push origin main`, (err) => {
      if (err === null) res('done')
      else {
        rej(new GitError(dir, err.message.split('\n')[0], true))
      }
    })
  })
}

function tryStageRestore(dir) {
  try {
    execSync(`git restore --stage .`, { stdio: 'pipe', cwd: dir }).toString()
  } catch (err) {
    // console.log('Something went wrong while tryig to unstage\n', err)
    // throw new Error('git unstage failed in gitStageAllIn')
    // console.log(err.stderr.toString().trim())
    if (err.stderr.toString().trim() === 'fatal: could not resolve HEAD') {
      return
    }
    throw new GitError(dir, err.message.split('\n')[0], false, 'restore', ['--stage'])
  }
}

function gitStageAllIn(dir, repoType, gitAddIgnore) {
  return new Promise((res, rej) => {
    const isMonoRepo = repoType === 'mono'
    if (isGitRepo(dir) || isMonoRepo) {
      tryStageRestore(dir)
      const cmd = `cd ${dir} && git add ${isMonoRepo ? '.' : '-A'}  --verbose ${gitAddIgnore || ''}`
      exec(cmd, (err, stdout) => {
        if (err === null) {
          if (stdout.trim() === '') {
            // const status = execSync(`cd ${dir} && git status`).toString().trim()
            // TODO -- use status from above line to write to log
            execSync(`cd ${dir} && git status`).toString().trim()
            res([])
          } else {
            // console.log(chalk.green(stdout))
            const stagedFiles = stdout
              .trim()
              .split('\n')
              .map((v) => v.split(' ')[1].replace(/(^'|'$)/g, ''))

            res(stagedFiles)
          }
        } else {
          rej(new Error('Something went wrong with git add'))
        }
      })
    }
  })
}

function gitCommitWithMsg(dir, msg, repoType) {
  return new Promise((res, rej) => {
    const isMonoRepo = repoType === 'mono'
    if (isGitRepo(dir) || isMonoRepo) {
      exec(`cd ${dir} && git commit -m "${msg}" --verbose`, (err, stdout) => {
        if (err === null) {
          res('')
        } else if (err.code === 1 && stdout.indexOf('nothing to commit') > -1) {
          res('')
        } else if (err.code === 1 && err.message.indexOf('husky') > -1) {
          const error = err.message.slice(err.message.indexOf('husky'), err.message.indexOf('(error)'))
          rej(new GitError(dir, error, false, 'commit', ['-m']))
        } else {
          rej(new GitError(dir, err.message.split('\n')[0]), false, 'commit', ['-m'])
        }
      })
    } else {
      throw new GitError(dir, 'Not a git repository', false, 'commit', ['-m'])
    }
  })
}

async function checkAndSetGitConfigNameEmail(dirPath, configData) {
  // git username try
  try {
    execSync(`cd ${dirPath} && git config --global user.name`, {
      stdio: 'ignore',
    })
  } catch (err) {
    const { gitUserName, gitUserEmail } = configData || (await getGitConfigNameEmail())
    try {
      execSync(`cd ${dirPath} && git config --local user.name ${gitUserName}`)
      execSync(`cd ${dirPath} && git config --local user.email ${gitUserEmail}`)
      if (!configData) {
        // If there is configData, we are probably calling from push, so no need to display info
        console.log('\n')
        console.log(chalk.dim(`Git local config updated with ${chalk.bold(gitUserName)} & ${chalk.bold(gitUserEmail)}`))
        console.log('\n')
      }
    } catch (error) {
      throw new GitError(dirPath, error.message.split('\n')[0], false, 'config', [`--local user.name ${gitUserName}`])
    }
  }
}

module.exports = {
  isGitInstalled,
  isInGitRepository,
  tryGitInit,
  getGitDirsIn,
  gitPushAllIn,
  gitStageAllIn,
  gitCommitWithMsg,
  checkAndSetGitConfigNameEmail,
  isClean,
  getTags,
  getLatestVersion,
  addTag,
  pushTags,
  isCleanBlock,
}
