/* eslint-disable guard-for-in */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const fs = require('fs')
const fsPromise = require('fs/promises')
const isRunning = require('is-running')
const path = require('path')
// const { readdirSync, readFileSync, existsSync } = require('fs')
// const { execSync } = require('child_process')
// const { compare } = require('compare-versions')

const { runBash } = require('../subcommands/bash')

/**
 *
 * @param {Array<Number} PORTS
 * @param {Record<'dependencies',import('./jsDoc/types').dependencies>} appConfig
 * @returns
 */
async function copyEmulatorCode(PORTS, dependencies) {
  // const blocks = appConfig.dependencies
  const blocksData = Object.values(dependencies).reduce((acc, bl) => {
    acc[bl.meta.name] = { type: bl.meta.type, dir: bl.directory }
    return acc
  }, {})

  const emulatorData = {}
  for (const [i, bt] of ['function', 'job'].entries()) {
    if (Object.values(blocksData).find((b) => bt === b.type)) {
      emulatorData[bt] = PORTS[i] || PORTS[PORTS.length - 1] + 1
    }
  }

  const emulatorDataEntries = Object.entries(emulatorData)

  const emulatorCode = `
  import express from "express";
  import http from "http";
  import cors from "cors";
  import { readFile } from "fs/promises";
  import swaggerUi from "swagger-ui-express";
  import swaggerJSDoc from "swagger-jsdoc";
  import fs from "fs"
  
  const appHandler = (type) => async (req, res, next) => {
    try {
      const blocks = ${JSON.stringify(blocksData)}
  
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

  
  for (const [bt, port] of ${JSON.stringify(emulatorDataEntries)}) {
      const app = express();
      
      const OpenApiDocfilePath = "../";
      const apis=[]
    
      fs.readdirSync(OpenApiDocfilePath).forEach(file=>{
        let filePath ="../" + file + "/*.js";
        apis.push(filePath)
      })
          
      const options = {
        definition: {
          openapi: '3.0.0',
          info: {
            title: 'Api Doc',
            version: '1.0.0',
          },
        },
        apis: apis, // files containing annotations as above
      };

      const openapiSpecification = swaggerJSDoc(options)

      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpecification));
      app.use(cors());
      app.all("/*", appHandler(bt));
      const server = http.createServer(app);
      server.listen(port);
      console.log(bt + " emulator started on port " + port);
  }
`
  const packageJson = `
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
    "cors": "^2.8.5",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^4.6.2",
    "openapi-types": "^12.1.0"
  }
}
`

  // const getPackageJson = () => {
  //   const devDependencies = {}
  //   const dependencies = {}
  //   const getDirectories = (source) =>
  //     readdirSync(source, { withFileTypes: true })
  //       .filter((dirent) => dirent.isDirectory())
  //       .map((dirent) => dirent.name)

  //   const directories = getDirectories('./functions')
  //   let packages = {}
  //   let tempPackageJson = null

  //   for (let i = 0; i < directories.length; i+=1) {
  //     console.log(`========================${directories[i]}================================`)

  //     const file = `./functions/${directories[i]}/package.json`
  //     const data = readFileSync(file, 'utf8')
  //     if (data) {
  //       packages = JSON.parse(data)
  //       tempPackageJson = packages
  //       if (packages.devDependencies) {
  //         // eslint-disable-next-line guard-for-in
  //         for (let dep in packages.devDependencies) {
  //           // console.log('each dep = ', dep, packages.devDependencies[dep], devDependencies[dep])
  //           const thisVersion = packages.devDependencies[dep]
  //           if (devDependencies[dep] && devDependencies[dep] !== thisVersion) {
  //             if (compare(thisVersion, devDependencies[dep], '>')) {
  //               devDependencies[dep] = thisVersion
  //             }
  //             // console.log(dep, devDependencies[dep], thisItem, devDependencies[dep] !== thisItem)
  //           } else {
  //             devDependencies[dep] = thisVersion
  //           }
  //         }
  //       }
  //       console.log('-------------------------------------------------------------------------')
  //       if (packages.dependencies) {
  //         for (let dep in packages.dependencies) {
  //           // console.log('each dep = ', dep, packages.devDependencies[dep], devDependencies[dep])
  //           const thisItem = packages.dependencies[dep]
  //           if (dependencies[dep] && thisItem !== dependencies[dep]) {
  //             try {
  //               if (compare(thisItem, dependencies[dep], '>')) {
  //                 dependencies[dep] = thisItem
  //               }
  //             } catch (e) {
  //               dependencies[dep] = thisItem
  //             }

  //             // console.log(dep, thisItem, dependencies[dep], thisItem !== dependencies[dep])
  //           } else {
  //             dependencies[dep] = thisItem
  //           }
  //         }
  //       }
  //     }
  //     // console.log(dependencies)
  //   }

  //   const dir = './tmp'

  //   if (!existsSync(dir)) {
  //     tempPackageJson.dependencies = { ...dependencies, express: '^4.17.2', http: '0.0.1-security', cors: '^2.8.5' }
  //     tempPackageJson.devDependencies = devDependencies
  //     // mkdirSync(dir)
  //     // writeFileSync(`${dir}/package.json`, JSON.stringify(tempPackageJson, null, 2))
  //     return JSON.stringify(tempPackageJson, null, 2)
  //     // execSync(`cd ${dir} && npm i && tar -czvf nodemodules.tar.gz node_modules`)
  //     // execSync(`cd ${dir} && pnpm i`)
  //   }
  // }

  // const packageJson = getPackageJson()

  // console.log(packageJson)

  const gitignoreAddEm = `
  if grep -R "._ab_em" .gitignore
then
    echo "found emulator in gitignore"
else
    echo "._ab_em/*" >> .gitignore
fi
`
  await runBash('mkdir -p ._ab_em && cd ._ab_em && touch index.js && touch package.json')
  fs.writeFileSync('./._ab_em/index.js', emulatorCode)
  fs.writeFileSync('./._ab_em/package.json', packageJson)
  await runBash(gitignoreAddEm)

  return emulatorData
}

async function getEmulatorProcessData(rootDir) {
  // console.log(`Getting emulator data from ${rootDir}`)
  const root = rootDir || '.'
  const emulatorProcessData = JSON.parse(await fsPromise.readFile(`${root}/._ab_em/.emconfig.json`, 'utf8'))
  return emulatorProcessData
}

function addEmulatorProcessData(processData) {
  fs.writeFileSync('./._ab_em/.emconfig.json', JSON.stringify(processData))
}

async function stopEmulator(rootPath) {
  // if (localRegistry) {
  //   await Promise.all(
  //     Object.entries(localRegistry).map(async ([k, { rootPath }]) => {
  //       const emDir = `${rootPath}/._ab_em`
  //       if (!fs.existsSync(emDir)) return true

  //       const processData = await getEmulatorProcessData(rootPath)
  //       if (processData && processData.pid) {
  //         await runBash(`kill ${processData.pid}`)
  //       }
  //       await runBash(`rm -rf ${emDir}`)
  //       console.log(`${k} emulator stopped successfully!`)
  //       return true
  //     })
  //   )
  // } else {
  if (fs.existsSync(path.join(rootPath, '._ab_em'))) {
    const processData = await getEmulatorProcessData(rootPath)
    if (processData && processData.pid && isRunning(processData.pid)) {
      await runBash(`kill ${processData.pid}`)
    }

    await runBash(`rm -rf ${path.join(rootPath, '._ab_em')}`)
    console.log('emulator stopped successfully!')
  }
  // }
}

module.exports = {
  copyEmulatorCode,
  addEmulatorProcessData,
  getEmulatorProcessData,
  stopEmulator,
}
