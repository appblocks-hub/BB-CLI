const path = require('path')
const { promisify } = require('util')
const treeKill = require('tree-kill')
const isRunning = require('is-running')
const { symlink } = require('fs/promises')
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs')
const { createFileSync } = require('../../../../../utils/fileAndFolderHelpers')
const { runBashLongRunning, runBash } = require('../../../../bash')
const { checkPnpm } = require('../../../../../utils/pnpmUtils')
const { pexec } = require('../../../../../utils/execPromise')
const { configstore } = require('../../../../../configstore')
const { spinnies } = require('../../../../../loader')

const emulateElements = async (emEleFolder, port) => {
  const logOutPath = path.resolve('./logs/out/elements.log')
  const logErrPath = path.resolve('./logs/err/elements.log')

  if (!existsSync(logErrPath)) {
    mkdirSync(path.join('./logs', 'err'), { recursive: true })
    createFileSync(logErrPath, '')
  }
  if (!existsSync(logOutPath)) {
    mkdirSync(path.join('./logs', 'out'), { recursive: true })
    createFileSync(logOutPath, '')
  }

  const child = runBashLongRunning(`npm start -- --port=${port}`, { out: logOutPath, err: logErrPath }, emEleFolder)

  const emConfigPath = path.join(emEleFolder, '.emconfig.json')
  writeFileSync(emConfigPath, JSON.stringify(child))

  return child
}

async function stopEmulatedElements(options) {
  const { rootPath = '.', hard } = options

  const emPath = path.join(rootPath, '._ab_em_elements')
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
    console.log({ hard })
    await runBash(`rm -rf ${emPath}`)
  }
}

const packageInstall = async (emEleFolder, elementBlocks) => {
  try {
    const src = path.join(emEleFolder, 'node_modules')

    let installer = 'npm i'
    const nodePackageManager = configstore.get('nodePackageManager')
    if (global.usePnpm || (!nodePackageManager && checkPnpm())) installer = 'pnpm i'

    spinnies.update('singleBuild', { text: `Installing dependencies for elements emulator (${installer})` })

    const res = await pexec(installer, { cwd: emEleFolder })
    if (res.err) throw new Error(res.err)

    for (const block of elementBlocks) {
      const dest = path.resolve(block.directory, 'node_modules')
      try {
        // rmSync(dest, { recursive: true, force: true })
        await symlink(src, dest)
      } catch (e) {
        // nothing
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

module.exports = {
  emulateElements,
  stopEmulatedElements,
  packageInstall,
  getModuleFederationPluginShared,
}
