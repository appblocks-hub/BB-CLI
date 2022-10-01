#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const inquirer = require('inquirer')
const inquirerFileTree = require('inquirer-file-tree-selection-prompt')
const { Command, Option } = require('commander')

// UTILS
const customList = require('../utils/customList')

const packageJson = require('../package.json')
const { blockTypes } = require('../utils/blockTypes')
const Init = require('../subcommands/init')
// const { isGitInstalled, isInGitRepository } = require('../utils/gitCheckUtils')
// const { ensureUserLogins } = require('../utils/ensureUserLogins')

const log = require('../subcommands/log')
const start = require('../subcommands/start')
const ls = require('../subcommands/ls')
const flush = require('../subcommands/flush')
const push = require('../subcommands/push')
const stop = require('../subcommands/stop')
const create = require('../subcommands/create')
const sync = require('../subcommands/sync')
const pull = require('../subcommands/pull')
const login = require('../subcommands/login')
const connect = require('../subcommands/connect')
const push_config = require('../subcommands/push_config')
const exec = require('../subcommands/exec')
const addTags = require('../subcommands/addTags')
const addCategories = require('../subcommands/addCategories')
const { preActionChecks } = require('../utils/preActionRunner')
const publish = require('../subcommands/publish')
const createApp = require('../subcommands/createApp')
const appPublish = require('../subcommands/appPublish')
const mark = require('../subcommands/mark')
const logout = require('../subcommands/logout')
const disconnect = require('../subcommands/disconnect')
const use = require('../subcommands/use')
const config = require('../subcommands/config')
const pr = require('../subcommands/pr')
const updateRuntimeCommand = require('../subcommands/runtime/update')

inquirer.registerPrompt('file-tree-selection', inquirerFileTree)
inquirer.registerPrompt('customList', customList)
process.global = { cwd: process.cwd() }

// eslint-disable-next-line no-unused-vars
function configSetOptionParse(value, _) {
  const a = value.split(',')
  const p = {}
  a.forEach((v) => {
    const [k, val] = v.split('=')
    p[k] = val
  })
  return p
}
async function init() {
  const program = new Command().hook('preAction', async (_, actionCommand) => {
    const subcommand = actionCommand.parent.args[0]
    await preActionChecks(subcommand)
  })

  // TODO -- get version properly
  program.version(packageJson.version)

  program
    .command('config')
    .option('-l,--list', 'To list all values')
    .option('-d,--delete <key>', 'To delete a value')
    .option('-s,--set <key> <value>', 'To set value', configSetOptionParse)
    .action(config)

  program.command('use').argument('[space_name]', 'Name of space to use').action(use)

  program.command('disconnect').argument('<service>', 'service to disconnect (github)').action(disconnect)

  program
    .command('connect')
    .argument('<service>', 'Name of service to connect')
    .option('-f, --force', 'force connect will remove existing tokens and restart login')
    .action(connect)

  program.command('logout').description('to logout of shield').action(logout)

  program
    .command('login')
    .option(' --no-localhost', 'copy and paste a code instead of starting a local server for authentication')
    .action(login)

  program
    .command('create')
    .argument('<component>', 'name of component')
    .addOption(
      new Option('-t, --type <component-type>', 'type  of comp').choices(
        blockTypes.reduce((acc, v) => {
          if (v[0] !== 'appBlock') return acc.concat(v[0])
          return acc
        }, [])
      )
    )
    .description('to create components')
    .action(create)

  program.command('init').argument('<appblock-name>', 'Name of app').description('create an appblock').action(Init)

  program
    .command('log')
    .argument('<block-name>', 'Name of a running block')
    .description('Streams the logs of a running block')
    .action(log)

  program.command('flush').description('To delete log files').action(flush)

  program.command('ls').description('List all running blocks').action(ls)

  program
    .command('publish')
    .argument('<block-name>', 'Name of block to publish')
    .description('Publish block or appblock')
    .action(publish)

  program
    .command('start')
    .argument('[name]', 'Name of block to start')
    .option('--use-pnpm', 'use pnpm to install dependencies')
    .description('To start one or all blocks')
    .action(start)

  program
    .command('stop')
    .argument('[name]', 'Name of block to stop')
    .description('To stop one or all blocks')
    .action(stop)

  program.command('sync').description('To sync all blocks').action(sync)

  // program.command('emulate', 'to start block', {
  //   executableFile: '../subcommands/emulate',
  // })
  // program.command('stop-emulator', 'to start block', {
  //   executableFile: '../subcommands/stop-emulator',
  // })

  program.command('pull').argument('<component>', 'name of component').action(pull)

  program.command('push-config').action(push_config)

  program
    .command('push')
    .argument('[block name]', 'Name of block to push')
    .option('-f, --force', 'commit and push all blocks')
    .option('-m, --message <message>', 'commit message')
    .description('To commit and push blocks')
    .action(push)

  program
    .command('exec')
    .argument('<command>', 'command to run in quotes.eg:"ls"')
    .option('-in,--inside <blocks...>', 'inside which block?')
    .action(exec)

  program
    .command('mark')
    .option('-d,--dependency <blocks...>', 'Create dependency')
    .option('-c,--composability <blocks...>', 'Create composability')
    .description('to create dependencies')
    .action(mark)

  program
    .command('add-tags')
    .option('-all, --all', 'Add tags to all blocks')
    .description('block add tags')
    .action(addTags)

  program
    .command('add-categories')
    .option('-all, --all', 'Add categories to all blocks')
    .description('block assign categories to blocks')
    .action(addCategories)

  program.command('create-app').description('register app for deploy').action(createApp)

  program.command('app-publish').description('Publish the app').action(appPublish)

  program.command('pr').argument('<block-name>', 'Name of block to pr').description('pr block').action(pr)
  program
    .command('update-runtime')
    .argument('<block-name>', 'Name of block to update runtime')
    .description('update block runtime')
    .action(updateRuntimeCommand)

  program.parseAsync(process.argv)
}

init()

process.on('SIGINT', () => {
  // console.log('force close --> cleaning up')
})

// process.on('exit', () => console.log(chalk.magenta(`\nExiting gracefully\n`)))
