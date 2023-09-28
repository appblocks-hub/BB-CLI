const path = require('path')
const { promisify } = require('util')
const treeKill = require('tree-kill')
const isRunning = require('is-running')
const { existsSync, readFileSync, writeFileSync, lstat, unlinkSync, rmSync, symlinkSync, cpSync } = require('fs')
const net = require('net')
const { runBashLongRunning, runBash } = require('../../../../bash')
const { pexec } = require('../../../../../utils/execPromise')
const { spinnies } = require('../../../../../loader')
const { getNodePackageInstaller } = require('../../../../../utils/nodePackageManager')
const {
  getBBFolderPath,
  BB_FOLDERS,
  BB_FILES,
  generateOutLogPath,
  generateErrLogPath,
} = require('../../../../../utils/bbFolders')
const { removeSync } = require('../../../../upload/onPrem/awsS3/util')
const { convertToEnv } = require('../../../../../utils/env')

const emulateElements = async (emEleFolder, port) => {
  const { ELEMENTS_LOG } = BB_FILES
  const logOutPath = generateOutLogPath(ELEMENTS_LOG)
  const logErrPath = generateErrLogPath(ELEMENTS_LOG)

  const logPaths = { out: logOutPath, err: logErrPath }
  const child = runBashLongRunning(`npm start -- --port=${port}`, logPaths, emEleFolder)

  const emConfigPath = path.join(emEleFolder, '.emconfig.json')
  writeFileSync(emConfigPath, JSON.stringify(child, null, 2))

  return { ...child, logPaths }
}

async function stopEmulatedElements(options) {
  const { rootPath = '.', hard } = options

  const emPath = getBBFolderPath(BB_FOLDERS.ELEMENTS_EMULATOR, rootPath)
  const emConfigPath = path.join(emPath, '.emconfig.json')
  if (existsSync(emConfigPath)) {
    const processData = JSON.parse(readFileSync(emConfigPath, 'utf8').toString())

    if (processData && processData.pid && isRunning(processData.pid)) {
      const treeKillPromise = promisify(treeKill)
      try {
        await treeKillPromise(processData.pid)
        console.log('elements emulator stopped successfully!')
      } catch (error) {
        console.log('Error in stopping block process with pid ', processData.pid)
      }
    }
  }

  if (hard && existsSync(emPath)) {
    await runBash(`rm -rf ${emPath}`)
  }
}

const packageInstall = async (emEleFolder, elementBlocks) => {
  try {
    const src = path.join(emEleFolder, 'node_modules')

    const { installer } = getNodePackageInstaller()

    spinnies.update('singleBuild', { text: `Installing dependencies for elements emulator (${installer})` })

    const res = await pexec(installer, { cwd: emEleFolder })
    if (res.err) throw new Error(res.err)

    for (const block of elementBlocks) {
      try {
        const dest = path.resolve(block.directory, 'node_modules')
        lstat(dest, (err, stats) => {
          if (err && err.code !== 'ENOENT') throw err

          if (stats?.isSymbolicLink()) unlinkSync(dest)
          if (stats?.isDirectory()) rmSync(dest, { recursive: true })

          symlinkSync(src, dest)
        })
      } catch (e) {
        if (e.code !== 'ENOENT' && e.code !== 'EEXIST') {
          console.error(e.message, '\n')
        }
      }
    }
  } catch (e) {
    console.log(`Error in install dependencies: `, e.message)
    throw e
  }
}

const getModuleFederationPluginShared = async (directory) => {
  const sharedFed = path.resolve(directory, 'federation-shared.js')
  if (!existsSync(sharedFed)) return {}
  const webpackShared = await import(sharedFed)
  const webpackSharedJs = webpackShared.default || {}
  if (webpackShared) return webpackSharedJs
  return {}
}

// eslint-disable-next-line arrow-body-style
const portInUse = async (port) => {
  return new Promise((resolve) => {
    const server = net.createServer((socket) => {
      socket.write('Echo server\r\n')
      socket.pipe(socket)
    })

    server.on('error', () => {
      resolve(true)
    })
    server.on('listening', () => {
      server.close()
      resolve(false)
    })

    server.listen(port, '127.0.0.1')
  })
}

const buildBlock = async (block, envData, env) => {
  const envType = ['ui-elements', 'ui-container'].includes(block.config.type) ? 'view' : 'function'

  let envPath = path.resolve(`.env.${envType}.${env}`)
  if (!existsSync(envPath)) {
    envPath = path.resolve(`.env.${envType}`)
  } else {
    // eslint-disable-next-line no-param-reassign
    envData = {}
  }

  const existingEnvDataFile = await readFileSync(envPath).toString()
  const updatedEnv = convertToEnv(envData, existingEnvDataFile)

  const { installer } = getNodePackageInstaller()


  const blockDir = path.resolve(block.directory)
  const blockBuildEnvPath = path.join(blockDir, '.env')
  const blockBuildTmpEnvPath = path.join(blockDir, '.env_ab_tmp')

  if (existsSync(blockBuildEnvPath)) {
    cpSync(blockBuildEnvPath, blockBuildTmpEnvPath, { overwrite: true, recursive: true })
  }

  await writeFileSync(blockBuildEnvPath, updatedEnv)

  const i = await runBash(installer, blockDir)
  if (i.status === 'failed') return { error: i.msg }

  const bashRes = await runBash(`npm run build`, blockDir)
  if (bashRes.status !== 'success') return { error: bashRes.msg }

  if (existsSync(blockBuildTmpEnvPath)) {
    cpSync(blockBuildTmpEnvPath, blockBuildEnvPath, { overwrite: true, recursive: true })
  } else {
    removeSync([blockBuildEnvPath])
  }

  return {
    blockBuildFolder: path.join(blockDir, 'dist'),
  }
}

module.exports = {
  buildBlock,
  portInUse,
  emulateElements,
  stopEmulatedElements,
  packageInstall,
  getModuleFederationPluginShared,
}
