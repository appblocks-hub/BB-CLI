#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')

const packageJson = require('../package.json')

process.global = { cwd: process.cwd() }

const program = new Command('bb')

program.version(packageJson.version)

const cmd = program.command.bind(program)

// cmd('test', 'to tests')

cmd('run-test', 'to run tests')

cmd('add-categories', 'block assign categories to blocks')

cmd('add-tags', 'block add tags')

cmd('app-publish', 'Publish the app')

cmd('clear-logs', 'to clear logs')

cmd('config', 'to access cli configs')

cmd('connect', 'to connect github')

cmd('create', 'to create a new block')

cmd('create-version', 'Create version for block')

cmd('disconnect', 'to remove svn service')

cmd('exec', 'execute commands directly in block directories')

cmd('init', 'to initialize a package block')

cmd('log', 'Streams the logs of a live block')

cmd('login', 'to log in to shield')

cmd('logout', 'to logout of shield')

cmd('ls', 'List all running blocks')

cmd('publish', 'Publish block or appblock')

cmd('pull', 'to pull blocks')

cmd('push', 'To commit and push blocks')

cmd('start', 'To start one or all blocks')

cmd('stop', 'To stop one or all blocks')

cmd('sync', 'Sync blocks architecture with registry')

cmd('use', 'to select space')

cmd('set-appblock-version', 'To add supported version of appblock to block')

cmd('connect-remote', 'To add remote for package block')

program.parseAsync(process.argv)
