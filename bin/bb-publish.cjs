#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const publish = require('../subcommands/publish')
const checkAndSetUserSpacePreference = require('../utils/checkAndSetUserSpacePreference')
const { ensureUserLogins } = require('../utils/ensureUserLogins')

const program = new Command().hook('preAction', async () => {
  await ensureUserLogins()
  await checkAndSetUserSpacePreference()
})

program.argument('[block-name]', 'Name of block to publish').action(publish)

program.parse(process.argv)
