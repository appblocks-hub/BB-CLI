const { prompt } = require('inquirer')
const { configstore, headLessConfigStore } = require('../../../configstore')
const { feedback } = require('../../../utils/cli-feedback')

/**
 * Prompt question set the selected answers to config space details
 * @param {import('../../utils/jsDoc/types').spaceDetails} spaceData
 */
const promptAndSetSpace = async (spaceData, isOutOfContext) => {
  const question = [
    {
      type: 'list',
      message: 'Choose a space to continue',
      choices: spaceData.map((v) => ({ name: v.space_name, value: { id: v.space_id, name: v.space_name } })),
      name: 'spaceSelect',
    },
  ]
  const {
    spaceSelect: { name, id },
  } = await prompt(question)

  configstore.set('currentSpaceName', name)
  configstore.set('currentSpaceId', id)
  headLessConfigStore(null, isOutOfContext).set('currentSpaceName', name)
  headLessConfigStore(null, isOutOfContext).set('currentSpaceId', id)

  feedback({ type: 'success', message: `${name} set` })
}

module.exports = { promptAndSetSpace }
