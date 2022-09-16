/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-case-declarations */
const { execSync } = require('child_process')
const { readFile, writeFile, rename } = require('fs/promises')
const { readFileSync, writeFileSync, renameSync, readdirSync, statSync } = require('fs')
// const { readFileSync } = require('fs')
const path = require('path')
const chalk = require('chalk')
const { createFileSync, createDirForType, ensureDirSync, isDirEmpty } = require('../utils/fileAndFolderHelpers')
const {
  getBlockName,
  setWithTemplate,
  wantToCreateNewVersion,
  wouldLikeToRegisterTemplateBlocksAsNewBlock,
  sourceUrlOptions,
  readInput,
} = require('../utils/questionPrompts')
const createBlock = require('../utils/createBlock')
const { blockTypeInverter } = require('../utils/blockTypeInverter')
const checkBlockNameAvailability = require('../utils/checkBlockNameAvailability')
const { checkAndSetGitConfigNameEmail } = require('../utils/gitCheckUtils')
const templateConfig = require('./simpleTemplateConfig.json')
const { appConfig } = require('../utils/appconfigStore')
const create = require('./create')
const { configstore } = require('../configstore')
const { GitManager } = require('../utils/gitmanager')
const convertGitSshUrlToHttps = require('../utils/convertGitUrl')

const Init = async (appblockName) => {
  const templatesPath = path.join(__dirname, '..', 'templates', 'simple-todo-template')
  // const packagesPath = path.join(__dirname, '..', 'packages')
  const componentName = appblockName || (await getBlockName())

  // if dir is clean, create a config file with name for configstore to
  // initialize..

  const availableName = await checkBlockNameAvailability(componentName)

  // Check if github user name or id is not set (we need both, if either is not set inform)
  const u = configstore.get('githubUserId', '')
  const t = configstore.get('githubUserToken', '')

  // If user is giving a url then no chance of changing this name
  let blockFinalName = availableName
  let blockSource
  let userHasProvidedRepoUrl = false

  if (u === '' || t === '') {
    console.log(`${chalk.bgCyan('INFO')}:Seems like you have not connected to any version manager`)
    const o = await sourceUrlOptions()
    // 0 for cancel
    // 2 for go to connect
    // 3 for let me provide url
    if (o === 0) process.exit(1)
    else if (o === 2) {
      // INFO connecting to github from here might cause the same token in memory issue
      console.log('Cant do it now!')
    } else {
      const s = await readInput({ message: 'Enter source ssh url here', name: 'sUrl' })
      blockSource = { ssh: s.trim(), https: convertGitSshUrlToHttps(s.trim()) }
      userHasProvidedRepoUrl = true
    }
  } else {
    // const shortName = await getBlockShortName(availableName)
    // const { blockSource, cloneDirName, clonePath, blockFinalName } =
    const d = await createBlock(availableName, availableName, 1, '', false, '.')
    blockFinalName = d.blockFinalName
    blockSource = d.blockSource
  }

  const [dir] = [blockFinalName]
  const DIRPATH = path.resolve(dir)

  const prefersSsh = configstore.get('prefersSsh')
  const originUrl = prefersSsh ? blockSource.ssh : blockSource.https
  // INFO - Git is set in current directory, it could be having other git, might cause issue
  //        user is adviced to run in a new directory
  const Git = new GitManager('.', blockFinalName, originUrl, prefersSsh)
  if (userHasProvidedRepoUrl) {
    await Git.clone(DIRPATH)
    const emptyDir = await isDirEmpty(DIRPATH, '.git')
    if (!emptyDir) {
      console.log(`${chalk.bgRed('ERROR')}: Expected to find an empty repo`)
      process.exit(1)
    }
  }

  const CONFIGPATH = path.join(DIRPATH, 'appblock.config.json')
  createFileSync(CONFIGPATH, {
    name: blockFinalName,
    type: 'appBlock',
    source: blockSource,
  })

  await checkAndSetGitConfigNameEmail(blockFinalName)

  // NOTE: blockFinalName doesnt need to have a prefix here..it is an app
  // execSync(
  //   `git checkout -b main &&
  // git add -A &&
  // git commit -m 'initial commit' &&
  // git push origin main`,
  //   { cwd: path.resolve(blockFinalName) }
  // )

  Git.cd(path.resolve(blockFinalName)) // Change to git directory
  await Git.newBranch('main')
  await Git.stageAll()
  await Git.commit('initial app commit')
  await Git.push('main')

  appConfig.init(path.resolve(blockFinalName))

  const { useTemplate } = await setWithTemplate()

  if (!useTemplate) return

  // if (!appConfig.prefix) {
  //   const prefix = await getPrefix(componentName)
  //   appConfig.prefix = prefix
  // }

  const fastForward = await wouldLikeToRegisterTemplateBlocksAsNewBlock()

  ;(async function installDependencies(l, config, relativeDir) {
    const level = l + 1
    // const indent = ''.padStart(level, '- ')
    let localDirName = ''
    const fnNameChanges = {
      addTodo: 'addTodo',
      listTodos: 'listTodos',
      removeTodo: 'removeTodo',
    }
    for (const block in config.dependencies) {
      if (Object.hasOwnProperty.call(config.dependencies, block)) {
        // console.log('CONFIG dependencies', config.dependencies.todoContainer)
        const blockData = config.dependencies[block]
        const blockMeta = { ...blockData.meta }
        // console.log(blockMeta)
        localDirName = `${blockMeta.name}`
        let p = createDirForType(blockTypeInverter(blockMeta.type), DIRPATH)

        const createCustomVersion = fastForward && (await wantToCreateNewVersion(blockMeta.name))

        if (createCustomVersion) {
          const availableBlockName = await checkBlockNameAvailability(blockMeta.name, true)
          const { cloneDirName, clonePath, blockDetails } = await create(
            availableBlockName,
            { type: blockMeta.type },
            {},
            true,
            path.resolve(blockFinalName)
          )

          localDirName = cloneDirName
          p = clonePath

          blockMeta.name = blockDetails.name
          blockMeta.source = blockDetails.source
        }
        // console.log('localDir', localDirName)
        // console.log(path.resolve(p, localDirName))
        // console.log(p)
        // eslint-disable-next-line no-inner-declarations
        function capitalizeFirstLetter(string) {
          return string.charAt(0).toUpperCase() + string.slice(1)
        }

        try {
          ensureDirSync(path.resolve(p, localDirName))
          execSync(`cp -r -a -n ${path.join(templatesPath, blockData.directory)}/. ${path.resolve(p, localDirName)}`)
          if (createCustomVersion) {
            switch (blockMeta.type) {
              case 'ui-elements':
                // change the block file name if new version
                // console.log(`copied ${blockData.meta.name} to ${path.resolve(p, localDirName)}`)
                await rename(
                  path.resolve(p, localDirName, 'src', `${blockData.meta.name}.js`),
                  path.resolve(p, localDirName, 'src', `${blockMeta.name}.js`)
                )
                // execSync(`mv ${blockData.meta.name}.js ${blockMeta.name}.js`, {
                //   cwd: path.resolve(p, localDirName, 'src'),
                // })
                // console.log(`renamed ${blockData.meta.name} to ${blockMeta.name}`)

                // update in components in current config
                // eslint-disable-next-line no-param-reassign
                config.dependencies.todoContainer.components[blockData.meta.name] = blockMeta.name

                // Change function name and export to new name in componet file
                const blockFile = await readFile(path.resolve(p, localDirName, 'src', `${blockMeta.name}.js`), {
                  encoding: 'utf8',
                })
                const re = new RegExp(blockData.meta.name, 'g')
                await writeFile(
                  path.resolve(p, localDirName, 'src', `${blockMeta.name}.js`),
                  blockFile.replace(re, capitalizeFirstLetter(blockMeta.name)),
                  { encoding: 'utf8' }
                )

                // Change the name in App.js
                const AppJsFile = await readFile(path.resolve(p, localDirName, 'src', `App.js`), { encoding: 'utf8' })
                await writeFile(path.resolve(p, localDirName, 'src', `App.js`), AppJsFile.replace(re, blockMeta.name), {
                  encoding: 'utf8',
                })
                // Change name in webpack.js
                const webpackJsFile = await readFile(path.resolve(p, localDirName, `webpack.config.js`), {
                  encoding: 'utf8',
                })
                await writeFile(
                  path.resolve(p, localDirName, `webpack.config.js`),
                  webpackJsFile.replace(re, blockMeta.name),
                  { encoding: 'utf8' }
                )

                // Change name in package.json
                const packageJsonFile = await readFile(path.resolve(p, localDirName, `package.json`), {
                  encoding: 'utf8',
                })
                await writeFile(
                  path.resolve(p, localDirName, `package.json`),
                  packageJsonFile.replace(re, blockMeta.name),
                  { encoding: 'utf8' }
                )
                break
              case 'function':
                // Note the new name change
                fnNameChanges[blockData.meta.name] = blockMeta.name

                // eslint-disable-next-line no-loop-func
                Object.keys(fnNameChanges).forEach((v) => {
                  const newFnName = fnNameChanges[v]
                  const regx = new RegExp(v, 'g')
                  if (v !== newFnName) {
                    // console.log('Function name change detected..')
                    // console.log(`${v} has changed to ${newFnName}`)

                    // eslint-disable-next-line no-unused-expressions
                    !(function getAllFiles(dirPath, arrayOfFiles) {
                      const files = readdirSync(dirPath)
                      // console.log(files)
                      // arrayOfFiles = arrayOfFiles || []

                      files.forEach((file) => {
                        if (statSync(`${dirPath}/${file}`).isDirectory()) {
                          if (file.charAt(0) !== '.') getAllFiles(`${dirPath}/${file}`, arrayOfFiles)
                        } else {
                          // arrayOfFiles.push(path.join(__dirname, dirPath, '/', file))
                          const filePath = path.resolve(dirPath, file)
                          // console.log(`Reading file ${filePath}`)
                          const tempFile = readFileSync(filePath, {
                            encoding: 'utf8',
                          })
                          if (regx.test(tempFile)) {
                            // console.log(`Found ${v} in ${filePath}, Replacing..`)
                            writeFileSync(filePath, tempFile.replace(regx, newFnName), { encoding: 'utf8' })
                            // console.log('Replaced!!')
                          }
                        }
                      })

                      return arrayOfFiles
                    })(DIRPATH, [])

                    delete fnNameChanges[v]
                  }
                })
                break

              default:
                break
            }
          }

          // Check if components used by container has changed names..
          // i.e if todoItem -> 123 or todoInput -> 321 etc..
          if (blockMeta.type === 'ui-container') {
            // console.log('\nJust copied a container..')
            // console.log('Checking for component name changes..')
            const Components = config.dependencies.todoContainer.components
            // eslint-disable-next-line no-loop-func
            Object.keys(Components).forEach((v) => {
              if (Components[v] !== v) {
                // console.log(`\n!!! Name Change Detected`)
                // console.log(`${v} is changed to ${Components[v]}`)
                const re = new RegExp(v, 'gi')

                // Renaming in components folder
                renameSync(
                  path.resolve(p, localDirName, 'src', 'components', capitalizeFirstLetter(`${v}`)),
                  path.resolve(p, localDirName, 'src', 'components', capitalizeFirstLetter(`${Components[v]}`))
                )

                // Renaming the componet File
                renameSync(
                  path.resolve(
                    p,
                    localDirName,
                    'src',
                    'components',
                    capitalizeFirstLetter(`${Components[v]}`),
                    capitalizeFirstLetter(`${v}.js`)
                  ),
                  path.resolve(
                    p,
                    localDirName,
                    'src',
                    'components',
                    capitalizeFirstLetter(`${Components[v]}`),
                    capitalizeFirstLetter(`${Components[v]}.js`)
                  )
                )

                console.log(`Replacing ${v} inside componets to ${Components[v]}`)
                const componetJsFile = readFileSync(
                  path.resolve(
                    p,
                    localDirName,
                    'src',
                    'components',
                    capitalizeFirstLetter(`${Components[v]}`),
                    capitalizeFirstLetter(`${Components[v]}.js`)
                  ),
                  { encoding: 'utf8' }
                )
                writeFileSync(
                  path.resolve(
                    p,
                    localDirName,
                    'src',
                    'components',
                    capitalizeFirstLetter(`${Components[v]}`),
                    capitalizeFirstLetter(`${Components[v]}.js`)
                  ),
                  componetJsFile
                    .replace(re, Components[v])
                    .replace(`${Components[v]}`, capitalizeFirstLetter(Components[v])),
                  // The env is created as BLOCK_ENV_URL_todoInput -> BLOCK_ENV_URL_ANew if new name is aNew,
                  // That has to change to aNew, because env is generated as BLOCK_ENV_URL_aNew
                  // Replace all first and then change the first occurence, as it should the export name
                  { encoding: 'utf8' }
                )

                // Replace inside the index file in component
                // Eg: index.js inside components/TodoInput/
                const indexInsideComponet = readFileSync(
                  path.resolve(
                    p,
                    localDirName,
                    'src',
                    'components',
                    capitalizeFirstLetter(`${Components[v]}`),
                    `index.js`
                  ),
                  { encoding: 'utf8' }
                )
                writeFileSync(
                  path.resolve(
                    p,
                    localDirName,
                    'src',
                    'components',
                    capitalizeFirstLetter(`${Components[v]}`),
                    `index.js`
                  ),
                  indexInsideComponet.replace(re, capitalizeFirstLetter(Components[v])),
                  { encoding: 'utf8' }
                )

                // Replace name inside App.js
                const cppjs = readFileSync(path.resolve(p, localDirName, 'src', 'App.js'), { encoding: 'utf8' })
                writeFileSync(
                  path.resolve(p, localDirName, 'src', 'App.js'),
                  cppjs.replace(re, capitalizeFirstLetter(Components[v])),
                  { encoding: 'utf8' }
                )
              }
            })
          }

          appConfig.env = config.env || {}
          appConfig.addBlock({
            directory: path.relative(relativeDir, path.resolve(p, localDirName)),
            meta: {
              ...blockMeta,
            },
          })

          if (createCustomVersion) {
            await checkAndSetGitConfigNameEmail(path.resolve(p, localDirName))

            // Push the templates changes here
            Git.cd(path.resolve(p, localDirName))
            Git._createRemote(prefersSsh ? blockMeta.source.ssh : blockMeta.source.https, prefersSsh)
            await Git.newBranch('main')
            await Git.stageAll()
            await Git.commit('initial commit')
            await Git.push('main')
          }
        } catch (err) {
          console.log(err)
          console.log('Something went wrong while bootstrapping ', blockMeta.name)
        }

        if (blockMeta.dependencies) installDependencies(level, blockMeta.dependencies, path.resolve(p, localDirName))
      }
    }
  })(1, templateConfig, path.resolve(DIRPATH))

  // execSync(`npm i -g ${path.join(packagesPath, 'node-block-sdk')}`)
  // console.log('Use block push after changing')
  console.log('Finished setting up template.')
  // await createBlock(componentName, componentName, 'appBlock', '')

  process.on('SIGINT', () => {
    // console.log('force close --> cleaning up')
    process.kill()
  })
}

// To avoid calling Init twice on tests
// if (process.env.NODE_ENV !== 'test') Init(process.argv)

module.exports = Init
