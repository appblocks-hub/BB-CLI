/* eslint-disable no-case-declarations */
const path = require('path')
const { execSync } = require('child_process')
const { readFile, writeFile, rename } = require('fs/promises')
const { readFileSync, writeFileSync, renameSync, readdirSync, statSync } = require('fs')

const { createDirForType, ensureDirSync } = require('../../utils/fileAndFolderHelpers')
const { wantToCreateNewVersion, wouldLikeToRegisterTemplateBlocksAsNewBlock } = require('../../utils/questionPrompts')
const { blockTypeInverter } = require('../../utils/blockTypeInverter')
const checkBlockNameAvailability = require('../../utils/checkBlockNameAvailability')
const { checkAndSetGitConfigNameEmail } = require('../../utils/gitCheckUtils')
const templateConfig = require('../simpleTemplateConfig.json')
const { appConfig } = require('../../utils/appconfigStore')
const create = require('../create')

const setupTemplate = async (options) => {
  const { DIRPATH, blockFinalName, Git, prefersSsh } = options

  const templatesPath = path.join(__dirname, '..', '..', 'templates', 'simple-todo-template')
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
                const oldName = v
                const newName = Components[v]
                /**
                 * @type {Object} Regx to match all old component name
                 */
                const regx1 = new RegExp(oldName, 'gi')
                /**
                 * @type {Object} Regex to match function name
                 */
                const regx2 = new RegExp(`(?<=const\\s)${newName}(?=\\s=)`, 'gi')
                /**
                 * @type {Object} Regx to match default export function name
                 */
                const regx3 = new RegExp(`(?<=export\\sdefault\\s)${newName}`, 'gi')

                // Rename the component folder eg. todoInput -> todoInputOne
                /**
                 *  /src/components
                 * @type {String} path to components folder
                 */
                const p1 = path.resolve(p, localDirName, 'src', 'components')
                renameSync(path.join(p1, capitalizeFirstLetter(v)), path.join(p1, capitalizeFirstLetter(newName)))

                // Renaming the componet File eg. todoInputOne/todoInput.js -> todoInputOne/todoInputOne.js
                /**
                 * /src/components/*
                 * @type {string} path to folders inside components folder
                 */
                const p12 = path.join(p1, capitalizeFirstLetter(newName))
                renameSync(
                  path.join(p12, capitalizeFirstLetter(`${oldName}.js`)),
                  path.join(p12, capitalizeFirstLetter(`${newName}.js`))
                )

                console.log(`Replacing ${oldName} inside componets to ${newName}`)
                const p12a = path.join(p12, capitalizeFirstLetter(`${newName}.js`))
                const componetJsFile = readFileSync(p12a, { encoding: 'utf8' })
                writeFileSync(
                  p12a,
                  componetJsFile
                    .replace(regx1, newName)
                    .replace(regx2, capitalizeFirstLetter(newName))
                    .replace(regx3, capitalizeFirstLetter(newName)),
                  // The env is created as BLOCK_ENV_URL_todoInput -> BLOCK_ENV_URL_ANew if new name is aNew,
                  // That has to change to aNew, because env is generated as BLOCK_ENV_URL_aNew
                  // Replace all first and then change the first occurence, as it should the export name
                  { encoding: 'utf8' }
                )

                // Replace inside the index file in component
                // Eg: index.js inside components/TodoInput/
                const indexInsideComponet = readFileSync(path.join(p12, 'index.js'), { encoding: 'utf8' })
                writeFileSync(
                  path.join(p12, 'index.js'),
                  indexInsideComponet.replace(regx1, capitalizeFirstLetter(newName)),
                  { encoding: 'utf8' }
                )

                // Replace name inside App.js
                const cppjs = readFileSync(path.resolve(p, localDirName, 'src', 'App.js'), { encoding: 'utf8' })
                writeFileSync(
                  path.resolve(p, localDirName, 'src', 'App.js'),
                  cppjs.replace(regx1, capitalizeFirstLetter(newName)),
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

module.exports = setupTemplate
