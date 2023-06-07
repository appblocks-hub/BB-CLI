const path = require('path')
const { writeFileSync, readFileSync, rmSync,  lstat, unlinkSync, symlinkSync } = require('fs')
const { updatePackageVersionIfNeeded } = require('../../../start/singleBuild/mergeDatas')

/**
 *
 * @param {import('fs').PathLike} emPath Emulator directory path
 * @returns
 */
async function linkEmulatedNodeModulesToBlocks(emEleFolder, blockEmulateData) {
  const src = path.resolve(emEleFolder, 'node_modules')
  await Promise.all(
    Object.values(blockEmulateData).map(async (bk) => {
      try {
        const dest = path.resolve(bk.directory, 'node_modules')
        lstat(dest, (err, stats) => {
          if (err && err.code !== 'ENOENT') throw err

          if (stats?.isSymbolicLink()) unlinkSync(dest)
          if (stats?.isDirectory()) rmSync(dest, { recursive: true })

          symlinkSync(src, dest)
        })
      } catch (e) {
        if (e.code !== 'ENOENT' && e.code !== 'EEXIST') {
          console.error(e.message, '\n')
        }
      }
    })
  )
}

/**
 *
 * @param {import('fs').PathLike} emulatorPath Emulator directory path
 * @returns
 */
async function updateEmulatorPackageSingleBuild(emulatorPath, blockEmulateData) {
  const emulatorPackageJsonPath = path.join(emulatorPath, 'package.json')
  const emulatorPackageJson = await JSON.parse(readFileSync(path.resolve(emulatorPackageJsonPath)).toString())
  // await symlink(src, dest)
  const mergedPackages = {
    dependencies: { em: emulatorPackageJson.dependencies || {} },
    devDependencies: { em: emulatorPackageJson.devDependencies || {} },
  }

  await Promise.all(
    Object.values(blockEmulateData).map(async (bk) => {
      const { name, directory } = bk
      try {
        const packages = await JSON.parse(readFileSync(path.join(directory, 'package.json')).toString())
        mergedPackages.dependencies = { ...mergedPackages.dependencies, [name]: packages?.dependencies || {} }
        mergedPackages.devDependencies = {
          ...mergedPackages.devDependencies,
          [name]: packages?.devDependencies || {},
        }
      } catch (error) {
        console.error(`${error.message} on block ${name}`)
      }
    })
  )

  emulatorPackageJson.dependencies = updatePackageVersionIfNeeded(mergedPackages.dependencies)
  emulatorPackageJson.devDependencies = updatePackageVersionIfNeeded(mergedPackages.devDependencies)

  writeFileSync(emulatorPackageJsonPath, JSON.stringify(emulatorPackageJson, null, 2))
}

module.exports = {
  linkEmulatedNodeModulesToBlocks,
  updateEmulatorPackageSingleBuild,
}
