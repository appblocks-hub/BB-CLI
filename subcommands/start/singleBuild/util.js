const path = require('path')
const { promisify } = require('util')
const treeKill = require('tree-kill')
const isRunning = require('is-running')
const { symlink } = require('fs/promises')
const { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } = require('fs')
const { createFileSync } = require('../../../utils/fileAndFolderHelpers')
const { runBashLongRunning, runBash } = require('../../bash')

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
  const { rootPath = '.' } = options

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

  if (existsSync(emPath)) {
    await runBash(`rm -rf ${emPath}`)
  }
}

const packageInstall = async (emEleFolder, elementBlocks) => {
  try {
    const modulesPath = path.join(emEleFolder, 'node_modules')
    if (existsSync(modulesPath)) rmSync(modulesPath, { recursive: true })

    let installer = 'npm i'
    if (global.usePnpm) installer = 'pnpm i'
    const i = await runBash(`cd ${emEleFolder} && ${installer}`)
    if (i.status === 'failed') {
      throw new Error(i.msg)
    }

    await Promise.all(
      elementBlocks.map(async (bk) => {
        const dest = path.resolve(bk.directory, 'node_modules')

        if (existsSync(dest)) {
          rmSync(dest, { recursive: true, force: true })
        }
        const src = path.join(emEleFolder, 'node_modules')
        await symlink(src, dest)
      })
    )
  } catch (e) {
    console.log(`Error in install dependencies: `, e.message)
    throw e
  }
}

module.exports = {
  emulateElements,
  stopEmulatedElements,
  packageInstall,
}
