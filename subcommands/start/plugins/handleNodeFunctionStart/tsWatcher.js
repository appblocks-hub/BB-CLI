#!usr/bin/env node
const fs = require('fs')
const { exec } = require('child_process')
const chokidar = require('chokidar')
const path = require('path')

function Watch() {
  const [_node, _script, ...watchList] = process.argv
  const watcher = chokidar.watch(watchList, {
    persistent: true,
    ignoreInitial: false,
  })
  watcher.on('all', (_a, b) => {
    if (b.includes('node_modules')) return
    if (b.slice(-3) !== '.ts') return

    const directory = path.dirname(b)
    fs.readdir(directory, (err, files) => {
      if (err) {
        throw err
      }

      const tsFiles = files.filter((file) => path.extname(file) === '.ts')
      tsFiles.forEach((tsFile) => {
        const tsFilePath = path.join(directory, tsFile)
        exec(
          `npx babel ${tsFilePath} --out-file  ${path.join(directory, tsFile.replace('.ts', '.js'))}`,
          { cwd: directory },
          (error) => {
            if (error) {
              throw error
            }
          }
        )
      })
    })
  })
}

Watch()
