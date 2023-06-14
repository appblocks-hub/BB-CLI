#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')

const checkAndSetUserSpacePreference = require('../utils/checkAndSetUserSpacePreference')
const { ensureUserLogins } = require('../utils/ensureUserLogins')
const get = require('../subcommands/get')

const program = new Command().hook('preAction', async () => {
  await ensureUserLogins()
    await checkAndSetUserSpacePreference('get')
})

program.argument('[component]', 'Name of component').action(get)

program.parse(process.argv)
