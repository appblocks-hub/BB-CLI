const { readFileSync, writeFileSync, existsSync } = require('fs')
const chalk = require('chalk')
const path = require('path')
const { symlink } = require('fs/promises')
const semver = require('semver')

const updatePackageVersionIfNeeded = (mergedPackages) => {
  const updatedDeps = {}
  for (const dependencies of Object.values(mergedPackages)) {
    for (const dep of Object.keys(dependencies)) {
      try {
        const exVer = updatedDeps[dep] && updatedDeps[dep].replace('^', '')
        const isGt = exVer && semver.gt(exVer, dependencies[dep].replace('^', ''))

        // eslint-disable-next-line no-continue
        if (isGt) continue

        updatedDeps[dep] = dependencies[dep]
      } catch (e) {
        // console.log(e.message)
      }
    }
  }
  return updatedDeps
}

const mergeEnvs = async (envPath) => {
  const data = {}

  if (!existsSync(envPath)) return data

  const envData = readFileSync(envPath).toString().split('\n')
  for (let i = 0; i < envData.length; i += 1) {
    // eslint-disable-next-line no-continue
    if (!envData[i]) continue
    const [key, val] = envData[i].split('=')
    // if (!key.includes(`AB_${bName}`)) key = `AB_${bName}_${key}`
    data[key] = val
  }

  return data
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
  let mergedEnvs = {}
  let mergedFeds = {}
  const errorBlocks = []

  await Promise.all(
    elementBlocks.map(async (bk) => {
      const {
        meta: { name, type },
        directory: dir,
      } = bk

      const directory = path.resolve(dir)
      try {
        const src = path.join(directory, 'src', 'remote')
        if (existsSync(src)) {
          if (type !== 'ui-dep-lib') {
            const dest = path.join(emEleFolder, 'src', dir)
            await symlink(src, dest)
          }
        } else {
          throw new Error(`No src/remote found for block ${name}`)
        }

        if (!depLib) {
          const packages = JSON.parse(readFileSync(path.join(directory, 'package.json')).toString())
          mergedPackages.dependencies = { ...mergedPackages.dependencies, [name]: packages.dependencies }
          mergedPackages.devDependencies = { ...mergedPackages.devDependencies, [name]: packages.devDependencies }
        }

        const fedExData = await import(path.join(directory, 'federation-expose.js'))
        const processedFeds = await mergeFederationExpose(fedExData, dir)
        mergedFeds = { ...mergedFeds, ...processedFeds }

        const processedEnvData = await mergeEnvs(path.join(directory, '.env'), name)
        mergedEnvs = { ...mergedEnvs, ...processedEnvData }
      } catch (err) {
        errorBlocks.push(name)
        console.log(chalk.red(`Error on ${name}: ${err.message}`))
      }
    })
  )

  return { mergedPackages, mergedEnvs, mergedFeds, errorBlocks }
}

const mergeDatas = async (elementBlocks, emEleFolder, depLib, env) => {
  const { mergedPackages, mergedEnvs, mergedFeds, errorBlocks } = await mergeAllDatas(
    elementBlocks,
    emEleFolder,
    depLib
  )

  let dependencies
  let devDependencies
  let mergedFedExposes = mergedFeds

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

  let envPath = path.resolve(`.env.view.${env}`)
  let mergedEnvsFromDotEnv = mergedEnvs
  if (!existsSync(envPath)) {
    envPath = path.resolve('.env.view')
  } else {
    mergedEnvsFromDotEnv = {}
  }
  const processedEnvData = await mergeEnvs(envPath)
  const mergedEnvsData = { ...mergedEnvsFromDotEnv, ...processedEnvData }
  const envData = Object.entries(mergedEnvsData).reduce((acc, [key, val]) => `${acc}${key}=${val}\n`, '')
  writeFileSync(path.join(emEleFolder, '.env'), envData)

  const fedExpoData = `export default ${JSON.stringify(mergedFedExposes, null, 2)}`
  writeFileSync(path.join(emEleFolder, 'federation-expose.js'), fedExpoData)

  writeFileSync(path.join(emEleFolder, 'src', 'index.js'), '')

  return errorBlocks
}

module.exports = {
  mergeDatas,
  updatePackageVersionIfNeeded,
}
