const { spawn } = require('child_process')
const { openSync, existsSync, readFileSync, writeFileSync, rmSync } = require('fs')
const { mkdir, writeFile, symlink, unlink, lstat } = require('fs/promises')
const path = require('path')
const { spinnies } = require('../../../../loader')
const { pexec } = require('../../../../utils/execPromise')
const { checkPnpm } = require('../../../../utils/pnpmUtils')
const { updateEnv } = require('../../../../utils/env')
const envToObj = require('../../envToObj')
const { updatePackageVersionIfNeeded } = require('../../../start/singleBuild/mergeDatas')

class BuildNodeFnEmulator {
  constructor() {
    this.fnBlocks = []
    this.blocksData = {}
    this.depsInstallReport = []
    this.port = 0
    this.pid = 0
  }

  // experimentalEMCODE = `
  // const app = express();
  // const router = Router();
  // const blocks = {
  //   addTodo: { type: "function", dir: "addTodo" },
  //   listTodos: { type: "function", dir: "listTodos" },
  //   removeTodo: { type: "function", dir: "removeTodo" },
  // };

  // const root = "..";
  // !(async () => {
  //   for (const block in blocks) {
  //     if (Object.hasOwnProperty.call(blocks, block)) {
  //       const { type, dir } = blocks[block];
  //       const { handler, middlewares, customPath, method } = await import(root + "/" + dir + "/" + "index.js");
  //       router[method?.toLowerCase() || "all"](\`/${customPath || dir}\`, middlewares || [], handler);
  //     }
  //   }
  // })();

  // app.use(router);
  // console.log(app._router);
  // app.listen(8080);
  // `

  // eslint-disable-next-line class-methods-use-this
  packageJson = () => `
  {
    "name": "appblock-emulator",
    "version": "1.0.0",
    "description": "",
    "main": "index.js",
    "type": "module",
    "scripts": {
      "start": "node index.js"
    },
    "author": "",
    "license": "ISC",
    "dependencies": {
      "express": "^4.17.2",
      "http": "0.0.1-security",
      "cors": "^2.8.5"
    }
  }`

  emulatorCode = () => `
    import express from "express";
    import http from "http";
    import cors from "cors";
    import { readFile } from "fs/promises";

    const appHandler = (type) => async (req, res, next) => {
      try {
        const blocks = ${JSON.stringify(this.blocksData)}

        const url = req.params[0];
        const [requested_func] = url.split("/");

        if (url.includes("health")) {
          //check for health param and inject if needed
          req.params["health"] = "health";
        }

        console.log("url", url);
        console.log("requested_func", requested_func);

        const blockData = blocks[requested_func];

        if (blockData) {
          if (blockData.type !== type) {
            res.send("Only " + type + " apis are allowed").status(403);
            return;
          }

          const func_route = "../" + blockData.dir + "/index.js"
          let handler = await import(func_route);
          if(process.env.NODE_ENV==="development"){
            handler = await import(func_route+"?update="+Date.now())
          }

          console.log("handler = ", handler);

          const event = {req, res, next}

          await handler.default(event);
        } else {
          res.send("requested function not registered in app.").status(404);
        }
      } catch (err) {
        console.error("Emulator error ", err);
        res.send("Something went wrong. Please check function log").status(500);
      }
    };

    const app = express();
    app.use(cors());
    app.all("/*", appHandler('function'));
    
    const server = http.createServer(app);
    server.listen(${this.port});
    console.log( "function emulator started on port " +${this.port});
  `

  /**
   *
   * @param {import('fs').PathLike} emPath Emulator directory path
   * @returns
   */
  async generateEmFolder(emPath) {
    const res = { err: false, data: '' }
    try {
      await mkdir(emPath, { recursive: true })
      await writeFile(path.join(emPath, '.gitignore'), '._ab_em/*')
      await writeFile(path.join(emPath, 'index.js'), this.emulatorCode())
      await writeFile(path.join(emPath, 'package.json'), this.packageJson())
      res.data = 'completed'
    } catch (err) {
      res.err = true
      res.data = err.message
    }
    return res
  }

  /**
   *
   * @param {import('fs').PathLike} emPath Emulator directory path
   * @returns
   */
  async linkEmulatedNodeModulesToBlocks(emEleFolder) {
    const src = path.resolve(emEleFolder, 'node_modules')
    await Promise.all(
      this.fnBlocks.map(async (bk) => {
        const dest = path.resolve(bk.directory, 'node_modules')

        try {
          if (existsSync(dest)) {
            await rmSync(dest, { recursive: true, force: true })
          } else if (lstat(dest)) {
            await unlink(dest)
          }
        } catch (e) {
          console.log({ e })
          // nothing
        }

        await symlink(src, dest)
      })
    )
  }

  /**
   *
   * @param {import('fs').PathLike} emulatorPath Emulator directory path
   * @returns
   */
  async updateEmulatorPackageSingleBuild(emulatorPath) {
    const emulatorPackageJsonPath = path.join(emulatorPath, 'package.json')
    const emulatorPackageJson = await JSON.parse(readFileSync(path.resolve(emulatorPackageJsonPath)).toString())
    // await symlink(src, dest)
    const mergedPackages = {
      dependencies: { em: emulatorPackageJson.dependencies || {} },
      devDependencies: { em: emulatorPackageJson.devDependencies || {} },
    }

    await Promise.all(
      this.fnBlocks.map(async (bk) => {
        const {
          meta: { name },
          directory: dir,
        } = bk
        const directory = path.resolve(dir)
        try {
          const packages = await JSON.parse(readFileSync(path.join(directory, 'package.json')).toString())
          mergedPackages.dependencies = { ...mergedPackages.dependencies, [name]: packages?.dependencies || {} }
          mergedPackages.devDependencies = { ...mergedPackages.devDependencies, [name]: packages?.devDependencies || {} }
        } catch (error) {
          console.error(`${error.message} on block ${name}`)
        }
      })
    )

    emulatorPackageJson.dependencies = updatePackageVersionIfNeeded(mergedPackages.dependencies)
    emulatorPackageJson.devDependencies = updatePackageVersionIfNeeded(mergedPackages.devDependencies)

    writeFileSync(emulatorPackageJsonPath, JSON.stringify(emulatorPackageJson, null, 2))
  }

  /**
   *
   * @param {} StartCore
   */
  apply(StartCore) {
    StartCore.hooks.buildFnEmulator.tapPromise(
      'BuildNodeFnEmulator',
      async (/** @type {StartCore} */ core, /** @type {AppblockConfigManager} */ config) => {
        const emPath = path.join(config.cwd, '._ab_em')
        const cmd = checkPnpm() ? 'pnpm i' : 'npm i'
        const logOutPath = path.join(config.cwd, './logs/out/functions.log')
        const logErrPath = path.resolve(config.cwd, './logs/err/functions.log')

        spinnies.add('emBuild', { text: 'Building function emulator' })
        /**
         * Filter node fn blocks
         */
        for (const { type, blocks } of core.blockGroups) {
          if (type !== 'function') continue
          this.fnBlocks = blocks.filter((b) => b.meta.language === 'nodejs')
        }
        this.fnBlocks.forEach((_v) => {
          this.blocksData[_v.meta.name] = { type: _v.meta.type, dir: _v.directory }
        })
        /**
         * Get port
         */
        this.port = this.fnBlocks[0].availablePort

        const _emFolderGen = await this.generateEmFolder(emPath)
        if (_emFolderGen.err) {
          spinnies.fail('emBuild', { text: 'Function emulator build failed' })
          return
        }

        if (core.cmdOpts.singleInstance) {
          await this.updateEmulatorPackageSingleBuild(emPath)
        }

        spinnies.update('emBuild', { text: 'Installing dependencies for function emulator' })
        const res = await pexec(cmd, { cwd: emPath })
        if (res.err) {
          spinnies.fail('emBuild', { text: 'Installing dependencies  failed for function emulator' })
          process.exit(1)
        }

        if (core.cmdOpts.singleInstance) {
          // symlink to all function blocks
          await this.linkEmulatedNodeModulesToBlocks(emPath)
        }

        spinnies.update('emBuild', { text: 'Starting emulator' })
        try {
          await mkdir(path.join(config.cwd, './logs', 'err'), { recursive: true })
          await mkdir(path.join(config.cwd, './logs', 'out'), { recursive: true })

          /**
           * Release port before server start
           */
          this.fnBlocks[0].key.abort()
          const child = spawn('node', ['index.js'], {
            cwd: emPath,
            detached: true,
            stdio: ['ignore', openSync(logOutPath, 'w'), openSync(logErrPath, 'w')],
            env: { ...process.env, parentPath: config.cwd },
          })
          child.unref()
          this.pid = child.pid
          await writeFile(path.join(emPath, '.emconfig.json'), `{"pid":${child.pid}}`)
          spinnies.succeed('emBuild', { text: `Function emulator started at http://localhost:${this.port}` })
        } catch (err) {
          spinnies.fail('emBuild', { text: 'Failed to start emulator' })
          return
        }

        if (!core.cmdOpts.singleInstance) {
          spinnies.add('fnDepIns', { text: 'Installing dependencies in fn blocks' })
          const pArray = []
          this.fnBlocks.forEach((_v) => {
            pArray.push(pexec(cmd, { cwd: _v.directory }, _v))
          })
          /**
           * @type {PromiseFulfilledResult<{err:boolean,data:object}>}
           */
          this.depsInstallReport = await Promise.allSettled(pArray)
          spinnies.succeed('fnDepIns', { text: 'installed deps' })
          const tsBlocks = []
          for (const _v of this.depsInstallReport) {
            if (!_v.value.err) {
              /**
               * If dependencies were properly installed,
               * Load the env's from block to global function.env
               */
              const _ = await envToObj(path.resolve(_v.value.data.directory, '.env'))
              await updateEnv('function', _)

              if (existsSync(path.join(path.resolve(_v.value.data.directory), 'index.ts'))) {
                tsBlocks.push(path.resolve(_v.value.data.directory))
              }

              // eslint-disable-next-line no-param-reassign
              config.startedBlock = {
                name: _v.value.data.meta.name,
                pid: this.pid || null,
                isOn: true,
                port: this.port || null,
                log: {
                  out: logOutPath,
                  err: logErrPath,
                },
              }
              continue
            }
            // console.log(`✓ installed deps in ${this.fnBlocks[i].meta.name}`)
            console.log(`✗ error installing deps in ${_v.value.data.meta.name}`)
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
        }
      }
    )
  }
}

module.exports = BuildNodeFnEmulator
