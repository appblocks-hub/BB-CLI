const chalk = require('chalk')

/**
 * @typedef inputArg
 * @type {Object}
 * @property {('info'|'error'|'warn'|'success')} type
 * @property {String} message
 */

/**
 * Displays message in colour
 * @param {inputArg} obj
 */
const feedback = (obj) => {
  const { type, message } = obj

  const { bgBlueBright, bgGreenBright, bgRedBright, bgMagentaBright, whiteBright: white } = chalk

  const prefixes = {
    info: bgBlueBright(white('INFO')),
    error: bgRedBright(white('ERROR')),
    warn: bgMagentaBright(white('WARN')),
    success: bgGreenBright(white('SUCCESS')),
  }

  // Split in 75 letters
  const parts = message?.match(/.{1,75}/g) || []

  parts.forEach((v) => console.log(`${prefixes[type]} ${white(v)}`))
}

module.exports = { feedback }
