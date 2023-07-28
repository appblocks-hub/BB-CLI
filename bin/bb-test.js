#!usr/bin/env node

const chalk = require('chalk')
const { Command } = require('commander')
const GitConfigFactory = require('../utils/gitManagers/gitConfigFactory')

const program = new Command().hook('preAction', async () => {})

program.argument('<name>', 'Name of block to start').action(test)

program.parse(process.argv)

async function test(name) {
  try {
    const { manager, error } = await GitConfigFactory.init()
    if (error) throw error
    const isAvailable = await manager.checkRepositoryNameAvailability({ repositoryName: name })
    console.log(`${name}${isAvailable ? 'is' : 'is not'} available`)
  } catch (error) {
    console.log(chalk.red(error.message))
  }
}

/**
 * A better strategy for automatically naming blocks
 * a command to generate headless config json - create the file only if user needs it - 4Hr
 * Update all prompt questions to return answer from headless config, if a flag to avoid propmt is set - 4Hrs
 *
 */
