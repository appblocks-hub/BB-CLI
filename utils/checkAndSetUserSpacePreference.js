/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { prompt } = require('inquirer')
const { configstore } = require('../configstore')
const { feedback } = require('./cli-feedback')
const { listSpaces } = require('./spacesUtils')

async function checkAndSetUserSpacePreference() {
  const currentSpaceName = configstore.get('currentSpaceName')

  if (!currentSpaceName) {
    try {
      const res = await listSpaces()
      if (res.data.err) {
        feedback({ type: 'error', message: res.data.msg })
        process.exit(1)
      }
      /**
       * @type {Array<import('./jsDoc/types').spaceDetails>}
       */
      const Data = res.data.data
      const question = [
        {
          type: 'list',
          message: 'Choose a space to continue',
          choices: Data.map((v) => ({ name: v.space_name, value: { id: v.space_id, name: v.space_name } })),
          name: 'spaceSelect',
        },
      ]
      const {
        spaceSelect: { name, id },
      } = await prompt(question)
      configstore.set('currentSpaceName', name)
      configstore.set('currentSpaceId', id)
    } catch (err) {
      // TODO: feedback here
      process.exit(1)
    }
  } else {
    // TODO: check and validate the existence of the space,
    // If the call to list spaces fails here continue with the
    // present space name and hope it works.No need to abort then.
    // If the space is not present in the returned list, prompt for new space selection
    feedback({ type: 'info', message: `CURRENT SPACE-${currentSpaceName}` })
  }
}
module.exports = checkAndSetUserSpacePreference
