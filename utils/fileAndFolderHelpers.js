/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// eslint-disable-next-line no-unused-vars
const { default: axios } = require('axios')
const fs = require('fs')
const { rename, readdir, stat } = require('fs/promises')
const path = require('path')
const { noop } = require('rxjs')
const { appBlockGetPresignedUrlForReadMe } = require('./api')
const { feedback } = require('./cli-feedback')
const { BlockPushError } = require('./errors/blockPushError')
const { getShieldHeader } = require('./getHeaders')
const { BB_CONFIG_NAME } = require('./constants')

/**
 * Creates dir if not present
 * @param {PathLike} dir Path of directory
 * @returns
 */
function ensureDirSync(dir) {
  let stats
  try {
    stats = fs.statSync(dir)
  } catch {
    noop()
  }
  if (stats && stats.isDirectory()) return

  fs.mkdirSync(dir)
}

/**
 * Creates a file in the path provided, creates parent directory if
 * it is missing - not recursive, only one level
 * @param {String} filePath File path
 * @param {Object} [data] Data to be written
 * @returns
 */
function createFileSync(filePath, data) {
  let stats
  try {
    stats = fs.statSync(filePath)
  } catch {
    noop()
  }
  if (stats && stats.isFile()) return

  const dir = path.dirname(filePath)
  try {
    if (!fs.statSync(dir).isDirectory()) {
      // parent is not a directory
      // This is just to cause an internal ENOENT error to be thrown
      fs.readdirSync(dir)
    }
  } catch (err) {
    // If the stat call above failed because the directory doesn't exist, create it
    if (err && err.code === 'ENOENT') fs.mkdirSync(dir)
    else throw err
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

function getBlockDirsIn(array) {
  // TODO: read the config - validate - check with registry
  const res = array.reduce((acc, v) => {
    try {
      const Fstat = fs.statSync(v)
      if (Fstat.isDirectory()) {
        const files = fs.readdirSync(v)
        // console.log('files in ' + v + ' are:\n', files)
        if (files.indexOf(BB_CONFIG_NAME) > -1) {
          return acc.concat(v)
        }
      }
    } catch (err) {
      console.log('Some thisn af', err)
    }
    return acc
  }, [])

  return res
}

function findBlockWithNameIn(name, dirs) {
  const res = dirs.reduce((acc, v) => {
    console.log('path name', path.resolve(v, BB_CONFIG_NAME))
    try {
      const config = JSON.parse(fs.readFileSync(path.resolve(v, BB_CONFIG_NAME)))
      console.log(config, name)
      if (config.name === name) return acc.concat(v)
    } catch (err) {
      console.log('Something went wrong in blocknamin', err)
    }
    return acc
  }, [])
  return res
}

/**
 *
 * @param {String} dir Path to dir
 * @param {String} blockName Name of block where fn is operating
 * @param {Boolean} showLogs To show internal messages
 * @returns Returns an array with path to readme in given dir
 */
function ensureReadMeIsPresent(dir, blockName, showLogs) {
  const files = fs.readdirSync(dir)
  const readmes = files.reduce((acc, v) => {
    if (v.toLocaleLowerCase() === 'readme.md') return acc.concat(path.resolve(dir, v))
    return acc
  }, [])

  if (readmes.length > 1) {
    if (showLogs) {
      console.log('Found more than one readme.\n')
      console.log(readmes)
      console.log('Please keep only one and try again..')
    }
    throw new BlockPushError(dir, blockName, 'Found Multiple readmes to push', true, 1)
  } else if (readmes.length === 0) {
    throw new BlockPushError(dir, blockName, 'No readme found', true, 1)
  } else {
    return readmes
  }
}

/**
 * @typedef uploadReadMeReturn
 * @property {String} status
 * @property {String} key
 * @property {String|Null} error
 */
/**
 *
 * @param {String} filePath File path
 * @returns {uploadReadMeReturn}
 */
async function uploadReadMe(filePath, block_id, block_version_id) {
  const result = { status: 'failed', key: '', error: '' }
  try {
    const resPre = await axios.post(
      appBlockGetPresignedUrlForReadMe,
      {
        block_id,
        block_version_id,
      },
      {
        headers: getShieldHeader(),
      }
    )
    const { data } = resPre

    result.key = data.key

    const file = fs.readFileSync(filePath, { encoding: 'utf8' })

    const res = await axios.put(data.url, file, {
      headers: {
        'content-type': 'text/markdown',
      },
    })

    result.status = res.status
    result.error = res.status === 200 ? null : res.data.msg
  } catch (err) {
    // TODO -- throw a ShieldError from here
    result.error = err.response.data?.msg || err.message
  }

  return result
}

/**
 * Return a path string where to put block of type in
 * @param {(1 | 2 | 3 | 4 | 5 | 6)} type Block type
 * @param {String} cwd
 * @returns {String} dir path to pull block to
 */
// eslint-disable-next-line no-unused-vars
function createDirForType(type, cwd) {
  const dirPath = cwd || '.'
  // switch (type) {
  //  case 1:
  //   break
  //  case 2:
  //    // ensureDirSync can create only one level if not present
  //    // so call for each level to make sure
  //    ensureDirSync(path.resolve(cwd, 'view'))
  //    ensureDirSync(path.resolve(cwd, 'view', 'container'))
  //    dirPath = path.resolve(cwd, 'view', 'container')
  //    break
  //  case 3:
  //    ensureDirSync(path.resolve(cwd, 'view'))
  //    ensureDirSync(path.resolve(cwd, 'view', 'elements'))
  //    dirPath = path.resolve(cwd, 'view', 'elements')
  //    break
  //  case 4:
  //    ensureDirSync(path.resolve(cwd, 'functions'))
  //    dirPath = path.resolve(cwd, 'functions')
  //    break
  //  case 5:
  //    // console.log('you have entered unknown territory')
  //    // process.exit(1)
  //    break
  //  case 6:
  //    ensureDirSync(path.resolve(cwd, 'functions'))
  //    ensureDirSync(path.resolve(cwd, 'functions', 'shared-fns'))
  //    dirPath = path.resolve(cwd, 'functions', 'shared-fns')
  //    break
  //  case 7:
  //    ensureDirSync(path.resolve(cwd, 'jobs'))
  //    dirPath = path.resolve(cwd, 'jobs')
  //    break
  //  default:
  //    console.log('Unknown type')
  //    process.exit(1)
  // }
  return dirPath
}
/**
 *
 * @param {String} dirname
 * @param  {...any} acceptedItems List of accepted file or folder names
 * @returns {Promise<Boolean>}
 */
function isDirEmpty(dirname, ...acceptedItems) {
  return fs.promises.readdir(dirname).then((files) => {
    // console.log(acceptedItems)
    // console.log(files)
    if (files.length === 0) {
      return true
    }
    if (files.some((item) => !acceptedItems.includes(item))) {
      return false
    }
    return true
  })
}

/**
 * To prepare a file list with values needed for moving
 * @param {String} dirPath
 * @param {String} destinationPath
 * @param {Array<String>} ignoreList
 * @returns {Promise<Array<Record<'oldPath'|'newPath'|'name',String>>}
 */
async function prepareFileListForMoving(dirPath, destinationPath, ignoreList = []) {
  const files = await readdir(dirPath)
  return files.reduce((acc, curr) => {
    if (!ignoreList.includes(curr))
      return acc.concat({
        name: curr,
        oldPath: path.resolve(dirPath, curr),
        newPath: path.resolve(destinationPath, curr),
      })
    return acc
  }, [])
}

/**
 * Moves files.
 * @param {Boolean} muted To mute logs
 * @param {Array<Record<'oldPath'|'newPath'|'name',String>} fileList
 * @return {Promise<Array<Record<'status'|'msg'|'newPath'|'oldPath'|'name',String>>}
 */
async function moveFiles(muted, fileList) {
  const report = []
  for (let j = 0; j < fileList.length; j += 1) {
    const { oldPath, newPath } = fileList[j]
    if (fs.statSync(oldPath).isDirectory()) {
      try {
        ensureDirSync(newPath)
        const files = await prepareFileListForMoving(oldPath, newPath, [])
        const res = await moveFiles(false, files)
        report.push(...res)
      } catch (err) {
        // eslint-disable-next-line no-unused-expressions
        !muted && feedback({ type: 'error', message: `Error in moving ${oldPath} to ${newPath}` })
        report.push({ status: 'failed', msg: err.message, oldPath, newPath, name: fileList[j] })
      }
    } else {
      try {
        await rename(oldPath, newPath)
      } catch (err) {
        // eslint-disable-next-line no-unused-expressions
        !muted && console.log(`Error in moving ${oldPath} to ${newPath}`)
        report.push({ status: 'failed', msg: err.message, oldPath, newPath, name: fileList[j] })
      }
    }
  }
  return report
}

async function scan(root) {
  const files = await readdir(root)
  const result = { parent: root, dirs: [], files: [] }
  for (let i = 0; i < files.length; i += 1) {
    const fullPath = path.join(root, files[i])
    const s = await stat(fullPath)
    if (s.isDirectory()) result.dirs.push(fullPath)
    else result.files.push(fullPath)
  }
  return result
}

module.exports = {
  ensureDirSync,
  createFileSync,
  getBlockDirsIn,
  findBlockWithNameIn,
  ensureReadMeIsPresent,
  uploadReadMe,
  createDirForType,
  isDirEmpty,
  moveFiles,
  prepareFileListForMoving,
  scan,
}
