#!usr/bin/env node

const { exec } = require('child_process')
const chokidar = require('chokidar')
const path = require('path')

function Watch() {
  const [_node, _script, ...watchList] = process.argv
  const watcher = chokidar.watch(watchList, {
    persistent: true,
    ignoreInitial: true,
  })
  watcher.on('all', (_a, b) => {
    if (b.includes('node_modules')) return
    if (b.slice(-3) === '.ts') {
      exec('npx tsc index.ts --module esnext --target esnext', { cwd: path.dirname(b) })
    }
  })
}

Watch()
