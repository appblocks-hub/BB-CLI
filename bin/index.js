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
const packageBlockInit = require('../subcommands/init')
// const { isGitInstalled, isInGitRepository } = require('../utils/gitCheckUtils')
// const { ensureUserLogins } = require('../utils/ensureUserLogins')
const deploy = require('../subcommands/deploy')
const createEnv = require('../subcommands/createEnv')
const upload = require('../subcommands/upload')
const provisionApp = require('../subcommands/provisionApp')
const deleteApp = require('../subcommands/deleteApp')

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
const publish = require('../subcommands/publish/index')
const createApp = require('../subcommands/createApp')
const appPublish = require('../subcommands/appPublish')
const mark = require('../subcommands/mark')
const logout = require('../subcommands/logout')
const disconnect = require('../subcommands/disconnect')
const use = require('../subcommands/use')
const config = require('../subcommands/config')
const startJob = require('../subcommands/job/start')
const stopJob = require('../subcommands/job/stop')
const pr = require('../subcommands/pr')
const updateLanguageVersionCommand = require('../subcommands/languageVersion/update')
const deleteCommand = require('../subcommands/delete')
const listLanguageVersionCommand = require('../subcommands/languageVersion/list')
const createBlockVersion = require('../subcommands/createBlockVersion/index')
const getBlockUpdate = require('../subcommands/getBlockUpdate')
const { blockTypeInverter } = require('../utils/blockTypeInverter')
const desc = require('./bb_command_descriptions')

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
  // init local registry

  const program = new Command().hook('preAction', async (_, actionCommand) => {
    await preActionChecks(actionCommand)
  })

  // TODO -- get version properly
  program.version(packageJson.version)

  program
    .command('config')
    .option('-l,--list', 'To list all values')
    .option('-d,--delete <key>', 'To delete a value')
    .option('-s,--set <key> <value>', 'To set value', configSetOptionParse)
    .description(desc.config)
    .action(config)

  program.command('use').argument('[space_name]', 'Name of space to use').description(desc.use).action(use)

  program
    .command('disconnect')
    .argument('<service>', 'service to disconnect (github)')
    .description(desc.disconnect)
    .action(disconnect)
    .addHelpText('after', `\nExample:\n  bb disconnect github`)

  program
    .command('connect')
    .argument('<service>', 'Name of service to connect')
    .option('-f, --force', 'force connect will remove existing tokens and restart login')
    .description(desc.connect)
    .action(connect)
    .addHelpText('after', `\nExample:\n  bb connect github`)

  program.command('logout').description('to logout of shield').description(desc.logout).action(logout)

  program
    .command('login')
    .option(' --no-localhost', 'copy and paste a code instead of starting a local server for authentication')
    .description(desc.login)
    .action(login)

  program
    .command('create')
    .argument('<component>', 'name of component')
    .addOption(
      new Option('-t, --type <component-type>', 'type of component')
        .choices(
          blockTypes.reduce((acc, v) => {
            if (v[0] !== 'package') return acc.concat(v[0])
            return acc
          }, [])
        )
        .argParser((s) => blockTypeInverter(s))
    )
    .option('--no-autoRepo')
    .description(desc.create)
    .action(create)

  program
    .command('init')
    .argument('<appblock-name>', 'Name of app')
    .option('--no-autoRepo')
    .description(desc.init)
    .action(packageBlockInit)
    .addHelpText('after', `\nExample:\n  bb init todo_package_app`)

  program.command('log').argument('[block-name]', 'Name of a running block').description(desc.log).action(log)

  program.command('flush').description(desc.flush).action(flush)

  program.command('ls').description(desc.ls).option('-g, --global', 'execute globally').action(ls)

  program
    .command('create-version')
    .argument('[block-name]', 'Name of block to create-version')
    .description(desc['create-version'])
    .action(createBlockVersion)

  program
    .command('publish')
    .argument('[block-name]', 'Name of block to publish')
    .description(desc.publish)
    .action(publish)

  program
    .command('start')
    .argument('[block name]', 'Name of block to start')
    .option('--use-pnpm', 'use pnpm to install dependencies')
    .description(desc.start)
    .action(start)

  program
    .command('stop')
    .argument('[block name]', 'Name of block to stop')
    .option('-g, --global', 'execute globally')
    .description(desc.stop)
    .action(stop)

  program.command('sync').description(desc.sync).action(sync)

  program
    .command('pull')
    .argument('<component>', 'Name of component with version. block@0.0.1')
    .option('--add-variant', 'Add as variant')
    .option('--no-variant', 'No variant')
    .option('-t, --type <variantType>', 'Type of variant to create')
    .description(desc.pull)
    .action(pull)

  program
    .command('get-block-update')
    .argument('<component>', 'Name of component')
    .description(desc['get-block-update'])
    .action(getBlockUpdate)

  program.command('push-config').description(desc['push-config']).action(push_config)

  program
    .command('push')
    .argument('[block name]', 'Name of block to push')
    .option('-f, --force', 'commit and push all blocks')
    .option('-m, --message <message>', 'commit message')
    .description(desc.push)
    .action(push)

  program
    .command('exec')
    .argument('<command>', 'command to run in quotes.eg:"ls"')
    .option('-in,--inside <blocks...>', 'inside which block?')
    .description(desc.exec)
    .action(exec)

  program
    .command('mark')
    .option('-d,--dependency <blocks...>', 'Create dependency')
    .option('-c,--composability <blocks...>', 'Create composability')
    .description(desc.mark)
    .action(mark)

  program
    .command('add-tags')
    .option('-all, --all', 'Add tags to all blocks')
    .description(desc['add-tags'])
    .action(addTags)

  program
    .command('add-categories')
    .option('-all, --all', 'Add categories to all blocks')
    .description(desc['add-categories'])
    .action(addCategories)

  program.command('create-app').description(desc['create-app']).action(createApp)

  program.command('app-publish').description('Publish the app').action(appPublish)

  program
    .command('start-job')
    .description(desc['start-job'])
    .argument('[block name]', 'Name of block to start')
    .action(startJob)

  program
    .command('stop-job')
    .description(desc['stop-job'])
    .argument('[block name]', 'Name of block to start')
    .action(stopJob)

  program.command('pr').argument('<block-name>', 'Name of block to pr').description(desc.pr).action(pr)

  program
    .command('update-language-version')
    .argument('<block-name>', 'Name of block to update language version')
    .description(desc['update-language-version'])
    .action(updateLanguageVersionCommand)

  program
    .command('list-language-version')
    .argument('<block-name>', 'Name of block to list language version')
    .description(desc['list-language-version'])
    .action(listLanguageVersionCommand)

  program
    .command('delete')
    .argument('[block name]', 'Name of component to delete')
    .option('-g, --global', 'execute globally')
    .description(desc.delete)
    .action(deleteCommand)

  program
    .command('deploy')
    .option('-rv, --release-version <release_version>', 'version number')
    .option('-rn, --release-note <release_note>', 'release note')
    .option('-env, --environment <environment>', 'environment')
    .description(desc.deploy)
    .action(deploy)

  program.command('delete-app').description(desc['delete-app']).action(deleteApp)

  program
    .command('provision-app')
    .argument('<app_id>', 'Id of app to provision')
    .description(desc['provision-app'])
    .action(provisionApp)

  program.command('create-env').description(desc['create-env']).action(createEnv)

  program
    .command('upload')
    .argument('[block]', 'name of block or block type')
    .requiredOption('-env, --environment <environment>', 'environment')
    .description(desc.upload)
    .action(upload)

  program.parseAsync(process.argv)
}

init()

process.on('SIGINT', () => {
  // console.log('force close --> cleaning up')
})

// process.on('exit', () => console.log(chalk.magenta(`\nExiting gracefully\n`)))
