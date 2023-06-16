/* eslint-disable class-methods-use-this */
const path = require('path')
const { spawn, execSync } = require('child_process')
const { openSync, existsSync } = require('fs')
const { mkdir, writeFile } = require('fs/promises')
const { spinnies } = require('../../../../loader')
const { pexec } = require('../../../../utils/execPromise')
const { generateEmFolder } = require('./generateEmulator')
const { updateEmulatorPackageSingleBuild, linkEmulatedNodeModulesToBlocks } = require('./mergeData')
const { getNodePackageInstaller } = require('../../../../utils/nodePackageManager')
const { headLessConfigStore } = require('../../../../configstore')
const { upsertEnv, readEnvAsObject } = require('../../../../utils/envManager')

class HandleNodeFunctionStart {
  constructor() {
    this.fnBlocks = []
    this.fnSharedBlocks = []
    this.blockEmulateData = {}
    this.middlewareBlockListData = {}
    this.depsInstallReport = []
    this.port = 5000
    this.pid = 0
  }

  /**
   *
   * @param {} StartCore
   */
  apply(StartCore) {
    StartCore.hooks.beforeStart.tapPromise('HandleNodeFunctionStart', async (/** @type {StartCore} */ core) => {
      if (core.cmdOpts.blockType && core.cmdOpts.blockType !== 'function') return

      /**
       * Filter node fn blocks
       */
      for (const { type, blocks } of core.blockStartGroups) {
        if (type === 'function') {
          this.fnBlocks = blocks.filter((b) => b.config.language === 'nodejs')
        } else if (type === 'shared-fn') {
          this.fnSharedBlocks = blocks.filter((b) => b.config.language === 'nodejs')
        }
      }

      if (!this.fnBlocks.length) return

      const emPath = path.join(core.cwd, '._ab_em')
      const { installer } = getNodePackageInstaller()
      const logOutPath = path.join(core.cwd, './logs/out/functions.log')
      const logErrPath = path.resolve(core.cwd, './logs/err/functions.log')

      spinnies.add('emBuild', { text: 'Building function emulator' })
      this.fnBlocks.forEach((block) => {
        const dir = path.relative(path.resolve(), block.directory)
        this.blockEmulateData[dir] = {
          name: block.config.name,
          type: block.config.type,
          directory: block.directory,
          middlewares: block.config.middlewares,
          relativeDirectory: dir,
        }
      })

      core.middlewareBlockList.forEach((block) => {
        const dir = path.relative(path.resolve(), block.directory)
        this.middlewareBlockListData[block.config.name] = {
          name: block.config.name,
          type: block.config.type,
          directory: block.directory,
          relativeDirectory: dir,
        }
      })

      /**
       * Get ports
       */
      this.port = this.fnBlocks[0].availablePort

      const _emFolderGen = await generateEmFolder(
        emPath,
        this.blockEmulateData,
        this.port,
        this.middlewareBlockListData
      )
      if (_emFolderGen.err) {
        spinnies.fail('emBuild', { text: 'Function emulator build failed' })
        return
      }

      if (core.cmdOpts.singleInstance) {
        const sharedBlocks = {}
        this.fnSharedBlocks.forEach((b) => {
          sharedBlocks[b.config.name] = {
            ...b.config,
            directory: b.directory,
          }
        })
        await updateEmulatorPackageSingleBuild(emPath, { ...this.blockEmulateData, ...sharedBlocks })
      }

      spinnies.update('emBuild', { text: 'Installing dependencies for function emulator' })
      const res = await pexec(installer, { cwd: emPath })
      if (res.err) {
        spinnies.fail('emBuild', { text: 'Installing dependencies failed for function emulator' })
        throw new Error(res.err)
      }

      if (core.cmdOpts.singleInstance) {
        spinnies.update('emBuild', { text: 'Configuring node modules' })
        await linkEmulatedNodeModulesToBlocks(emPath, this.blockEmulateData)
        if (this.fnSharedBlocks?.length) {
          await linkEmulatedNodeModulesToBlocks(
            emPath,
            this.fnSharedBlocks.map((m) => ({ directory: m.directory }))
          )
        }
      } else {
        spinnies.update('emBuild', { text: 'Installing dependencies in function blocks' })
        const pArray = []
        this.fnBlocks.forEach((_v) => {
          pArray.push(pexec(installer, { cwd: _v.directory }, _v))
        })
        /**
         * @type {PromiseFulfilledResult<{err:boolean,data:object}>}
         */
        this.depsInstallReport = await Promise.allSettled(pArray)
      }

      const { environment } = core.cmdOpts
      const headlessConfig = headLessConfigStore().store
      const currentPackEnvPrefix = core.packageConfig.name.toUpperCase()
      const envPrefixes = [currentPackEnvPrefix]

      if (headlessConfig.prismaSchemaFolderPath) {
        const ie = await pexec('npx prisma generate', { cwd: headlessConfig.prismaSchemaFolderPath })
        if (ie.err) throw new Error(ie.err)

        const envPath = path.join(path.resolve(), `.env.function.${environment}`)
        const existEnvData = await readEnvAsObject(envPath)
        const dbEnv = existEnvData[`BB_${currentPackEnvPrefix}_DATABASE_URL`]
        if (dbEnv) {
          execSync(`export BB_${currentPackEnvPrefix}_DATABASE_URL=${dbEnv}`)
        }
      }

      spinnies.update('emBuild', { text: 'Starting emulator' })

      try {
        await mkdir(path.join(core.cwd, './logs', 'err'), { recursive: true })
        await mkdir(path.join(core.cwd, './logs', 'out'), { recursive: true })

        // Release port before server start
        this.fnBlocks[0]?.portKey.abort()

        // handle environments
        const updateEnvValue = { [`BB_${currentPackEnvPrefix}_FUNCTION_URL`]: `http://localhost:${this.port}` }

        for (const { packageManager } of core.subPackages) {
          const pEnvPrefix = packageManager.config.name.toUpperCase()
          const relativePath = path.relative(path.resolve(), packageManager.directory)
          updateEnvValue[`BB_${pEnvPrefix}_FUNCTION_URL`] = `http://localhost:${this.port}/${relativePath}`
          envPrefixes.push(pEnvPrefix)
        }

        await upsertEnv('function', {}, environment, envPrefixes)
        await upsertEnv('view', updateEnvValue, environment, envPrefixes)

        // start node
        const child = spawn('node', ['index.js'], {
          cwd: emPath,
          detached: true,
          stdio: ['ignore', openSync(logOutPath, 'w'), openSync(logErrPath, 'w')],
          env: { ...process.env, parentPath: core.cwd },
        })
        child.unref()
        this.pid = child.pid
        await writeFile(path.join(emPath, '.emconfig.json'), `{"pid":${child.pid}}`)

        const updateConfig = {
          isOn: true,
          singleInstance: true,
          pid: this.pid || null,
          port: this.port || null,
          log: {
            out: logOutPath,
            err: logErrPath,
          },
        }

        for (const blockManager of this.fnBlocks) {
          blockManager.updateLiveConfig(updateConfig)
        }

        // update middleware block as live to avoid issues of some blocks are not start
        for (const blockManager of core.middlewareBlockList) {
          blockManager.updateLiveConfig(updateConfig)
        }

        // update middleware block as live to avoid issues of some blocks are not start
        for (const { type, blocks } of core.blockStartGroups) {
          if (type !== 'shared-fn') continue
          for (const blockManager of blocks) {
            blockManager.updateLiveConfig(updateConfig)
          }
        }

        spinnies.succeed('emBuild', { text: `Function emulator started at http://localhost:${this.port}` })
      } catch (err) {
        console.log(err)
        spinnies.fail('emBuild', { text: `Failed to start emulator: ${err.message}` })
        return
      }

      const tsBlocks = []
      for (const _v of this.depsInstallReport) {
        if (existsSync(path.join(path.resolve(_v.value.data.directory), 'index.ts'))) {
          tsBlocks.push(path.resolve(_v.value.data.directory))
        }

        // console.log(`✓ installed deps in ${this.fnBlocks[i].name}`)
        console.log(`✗ error installing deps in ${_v.value.data.config.name}`)
        /**
         * TODO: write a proper plugin for typescript
         */
        const watcher = spawn('node', ['tsWatcher.js', ...tsBlocks], {
          detached: true,
          cwd: path.join(__dirname),
          stdio: ['ignore', openSync(logOutPath, 'w'), openSync(logErrPath, 'w')],
        })
        await writeFile(path.join(emPath, '.emconfig.json'), `{"pid":${this.pid},"watcherPid":${watcher.pid}}`)

        watcher.unref()
      }
    })
  }
}

module.exports = HandleNodeFunctionStart
