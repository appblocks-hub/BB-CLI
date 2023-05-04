#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// const inquirer = require('inquirer')
// const inquirerFileTree = require('inquirer-file-tree-selection-prompt')
// inquirer.registerPrompt('file-tree-selection', inquirerFileTree)
// inquirer.registerPrompt('customList', customList)

const { Command } = require('commander')

const packageJson = require('../package.json')

process.global = { cwd: process.cwd() }

const program = new Command('bb')

program.version(packageJson.version)

const cmd = program.command.bind(program)

// cmd('test', 'to tests')

cmd('add-categories', 'block assign categories to blocks')

cmd('add-tags', 'block add tags')

cmd('app-publish', 'Publish the app')

cmd('clear-logs', 'to clear logs')

cmd('config', 'to access cli configs')

cmd('connect', 'to connect github')

cmd('create', 'to create a new block')

cmd('create-v2', 'to create a new block v2')

cmd('create-app', 'register app for deploy')

cmd('create-version', 'Create version for block')

cmd('delete', 'Delete block component')

cmd('disconnect', 'to remove svn service')

cmd('exec', 'execute commands directly in block directories')

cmd('get-update', 'to search for block update')

cmd('init', 'to initialize a package block')

cmd('list-language-version', 'list block language version')

cmd('log', 'Streams the logs of a live block')

cmd('login', 'to log in to shield')

cmd('logout', 'to logout of shield')

cmd('ls', 'List all running blocks')

cmd('mark', 'to create dependencies')

cmd('pr', 'pr block')

cmd('publish', 'Publish block or appblock')

cmd('pull', 'to pull blocks')

cmd('push', 'To commit and push blocks')

cmd('push-v2', 'To commit and push blocks')

cmd('push-config', 'to push package lock config')

cmd('start', 'To start one or all blocks')

cmd('start-v2', 'To start one or all blocks')

cmd('start-job', 'Schedule the job')

cmd('stop', 'To stop one or all blocks')

cmd('temp-create', 'to create a new block')

cmd('temp-init', 'temporary init command')

cmd('temp-migrate', 'Migrate existing architecture to Single Repo')

cmd('temp-push', 'Temporary Push command')

cmd('temp-pull', 'Temporary Pull command')

cmd('stop-job', 'Stop the job')

cmd('sync', 'To sync all blocks')

cmd('update-language-version', 'update block language version')

cmd('use', 'to select space')

cmd('set-appblock-version', 'To add supported version of appblock to block')

/**
 * PRIVATE FEATURES
 */

cmd('deploy', 'deploy app')

cmd('delete-app', 'Delete app')

cmd('provision-app', 'provision app for deploy')

cmd('create-env', 'create env for deploy')

cmd('upload', 'upload block for deploy')

program.parseAsync(process.argv)
