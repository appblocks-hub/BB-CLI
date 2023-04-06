const { spawn } = require('child_process')
const { openSync, existsSync } = require('fs')
const { mkdir, writeFile } = require('fs/promises')
const path = require('path')
const { spinnies } = require('../../../../loader')
const { pexec } = require('../../../../utils/execPromise')
const { checkPnpm } = require('../../../../utils/pnpmUtils')
const { updateEnv } = require('../../../../utils/env')
const envToObj = require('../../envToObj')

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
   * @param {} StartCore
   */
  apply(StartCore) {
    StartCore.hooks.buildFnEmulator.tapPromise(
      'BuildNodeFnEmulator',
      async (/** @type {StartCore} */ core, /** @type {AppblockConfigManager} */ config) => {
        const emPath = path.join(config.cwd, '._ab_em_')
        const cmd = checkPnpm() ? 'pnpm i' : 'npm i'
        const logOutPath = path.join(config.cwd, './logs/out/functions.log')
        const logErrPath = path.resolve(config.cwd, './logs/err/functions.log')

        spinnies.add('emBuild', { text: 'building fn emulator' })
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
          spinnies.fail('emBuild', { text: 'emulator build failed' })
          return
        }
        spinnies.succeed('emBuild', { text: 'emulator built' })
        spinnies.add('npm', { text: 'installing packages' })
        const res = await pexec(cmd, { cwd: emPath })
        if (res.err) {
          spinnies.fail('npm', { text: 'installing package failed' })
          process.exit(1)
        }
        spinnies.succeed('npm', { text: 'installing completed' })
        spinnies.add('startEm', { text: 'Starting emulator' })
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
          spinnies.succeed('startEm', { text: `Emulator started at ${this.port}` })
        } catch (err) {
          spinnies.fail('startEm', { text: 'Failed to start emulator' })
          return
        }

        spinnies.add('fnDepIns', { text: 'Installing dependencies in fn blocks' })
        const parray = []
        this.fnBlocks.forEach((_v) => {
          parray.push(pexec(cmd, { cwd: _v.directory }, _v))
        })

        /**
         * @type {PromiseFulfilledResult<{err:boolean,data:object}>}
         */
        this.depsInstallReport = await Promise.allSettled(parray)
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
        }
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
    )
  }
}

module.exports = BuildNodeFnEmulator
