const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs')
const chalk = require('chalk')
const path = require('path')
const { symlink } = require('fs/promises')
const semver = require('semver')
const { getModuleFederationPluginShared } = require('./util')

const updatePackageVersionIfNeeded = (mergedPackages) => {
  const updatedDeps = {}
  for (const dependencies of Object.values(mergedPackages)) {
    for (const dep of Object.keys(dependencies)) {
      try {
        const existingVersion = updatedDeps[dep]?.replace('^', '')
        const isGreaterThan = existingVersion && semver.gt(existingVersion, dependencies[dep]?.replace('^', ''))

        // eslint-disable-next-line no-continue
        if (isGreaterThan) continue

        updatedDeps[dep] = dependencies[dep]
      } catch (e) {
        // console.log(e.message)
      }
    }
  }
  return updatedDeps
}

const mergeFederationExpose = async (fedExData, dir) => {
  const exposedJs = fedExData.default || {}
  for (const key in exposedJs) {
    if (exposedJs[key]) {
      exposedJs[key] = exposedJs[key].replace('remote', dir)
    }
  }

  return exposedJs
}

const mergeAllDatas = async (elementBlocks, emEleFolder, depLib) => {
  const mergedPackages = { dependencies: {}, devDependencies: {} }
  const mergedEnvs = {}
  let mergedFedExpos = {}
  let mergedFedShared = {}
  const errorBlocks = []

  await Promise.all(
    elementBlocks.map(async (bk) => {
      const {
        config: { name, type },
        directory: fullDirectory,
      } = bk

      const directory = path.relative(path.resolve(), fullDirectory)

      try {
        const src = path.join(fullDirectory, 'src', 'remote')
        if (existsSync(src)) {
          if (type !== 'ui-dep-lib') {
            try {
              const dest = path.join(emEleFolder, 'src', directory)
              const parentDirPath = path.dirname(dest)
              if (!existsSync(parentDirPath)) mkdirSync(parentDirPath, { recursive: true })
              await symlink(src, dest)
            } catch (error) {
              if (error.code !== 'EEXIST') throw error
            }
          }
        } else {
          throw new Error(`No src/remote found for block ${name}`)
        }

        if (!depLib) {
          const packages = JSON.parse(readFileSync(path.join(fullDirectory, 'package.json'), 'utf-8'))
          mergedPackages.dependencies = { ...mergedPackages.dependencies, [name]: packages?.dependencies || {} }
          mergedPackages.devDependencies = {
            ...mergedPackages.devDependencies,
            [name]: packages?.devDependencies || {},
          }
        }

        const fedExData = await import(path.join(fullDirectory, 'federation-expose.js'))
        const processedFeds = await mergeFederationExpose(fedExData, directory)
        mergedFedExpos = { ...mergedFedExpos, ...processedFeds }

        const fedSharedData = await getModuleFederationPluginShared(directory)
        mergedFedShared = { ...mergedFedShared, ...fedSharedData }

        // const processedEnvData = await mergeEnvs(path.join(directory, '.env'), name)
        // mergedEnvs = { ...mergedEnvs, ...processedEnvData }
      } catch (err) {
        errorBlocks.push(name)
        console.log(chalk.red(`Error on ${name}: ${err.message}`))
      }
    })
  )

  return { mergedPackages, mergedEnvs, mergedFedExpos, errorBlocks, mergedFedShared }
}

const mergeDatas = async (elementBlocks, emEleFolder, depLib) => {
  const { mergedPackages, mergedFedExpos, mergedFedShared, errorBlocks } = await mergeAllDatas(
    elementBlocks,
    emEleFolder,
    depLib
  )

  let dependencies
  let devDependencies
  let mergedFedExposes = mergedFedExpos

  if (depLib) {
    const directory = path.resolve(depLib.directory)
    const packages = JSON.parse(readFileSync(path.join(directory, 'package.json')).toString())
    dependencies = packages.dependencies
    devDependencies = packages.devDependencies

    const fedExData = await import(path.join(directory, 'federation-expose.js'))
    const processedFeds = await mergeFederationExpose(fedExData, depLib.directory)
    mergedFedExposes = { ...mergedFedExposes, ...processedFeds }
  } else {
    dependencies = updatePackageVersionIfNeeded(mergedPackages.dependencies)
    devDependencies = updatePackageVersionIfNeeded(mergedPackages.devDependencies)
  }
  const packageJson = {
    name: 'emulator',
    type: 'module',
    main: 'index.js',
    homepage: '/emulator',
    scripts: {
      start: 'webpack-dev-server',
      test: 'echo "Error: no test specified" && exit 1',
      build: 'webpack --mode production',
      serve: 'webpack-cli serve',
      clean: 'rm -rf dist',
    },
    dependencies,
    devDependencies,
  }
  writeFileSync(path.join(emEleFolder, 'package.json'), JSON.stringify(packageJson, null, 2))

  const fedExpoData = `export default ${JSON.stringify(mergedFedExposes, null, 2)}`
  writeFileSync(path.join(emEleFolder, 'federation-expose.js'), fedExpoData)

  const mergedFedSharedData = `export default ${JSON.stringify(mergedFedShared, null, 2)}`
  writeFileSync(path.join(emEleFolder, 'federation-shared.js'), mergedFedSharedData)

  writeFileSync(path.join(emEleFolder, 'src', 'index.js'), '')

  return errorBlocks
}

module.exports = {
  mergeDatas,
  updatePackageVersionIfNeeded,
}
