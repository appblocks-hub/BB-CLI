const { configstore } = require('../configstore')
const { feedback } = require('../utils/cli-feedback')

const config = async (options) => {
  const { list, delete: del, set } = options
  const s = configstore.store
  if (del) {
    if (!configstore.has(del)) {
      feedback({ type: 'error', message: `${del} is not a key in config` })
    }
    configstore.delete(del)
  }
  if (set) {
    for (const optKey in set) {
      if (Object.hasOwnProperty.call(set, optKey)) {
        const element = set[optKey]

        if (configstore.has(optKey)) {
          feedback({ type: 'info', message: `${optKey} is already present with value ${configstore.get(optKey)}` })
          feedback({ type: 'info', message: `changing value to ${element}` })
          configstore.set(optKey, element)
          feedback({ type: 'success', message: 'value changed' })
        } else {
          configstore.set(optKey, element)
          feedback({ type: 'success', message: `${optKey} with value ${element} added to config` })
        }
      }
    }
  }
  if (list) {
    for (const key in s) {
      if (Object.hasOwnProperty.call(s, key)) {
        console.log(`${key}=${s[key]}`)
      }
    }
  }
}

module.exports = config
