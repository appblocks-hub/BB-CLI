const chalk = require('chalk')

/**
 * @typedef inputArg
 * @type {Object}
 * @property {('info'|'error'|'warn'|'success'|'muted')} type
 * @property {String} message
 */

/**
 * Displays message in colour
 * @param {inputArg} obj
 */
const feedback = (obj) => {
  const { type, message } = obj

  const { bgBlueBright, bgGreenBright, bgRedBright, bgMagentaBright, whiteBright: white, gray, dim } = chalk

  const prefixes = {
    info: bgBlueBright(white('INFO')),
    error: bgRedBright(white('ERROR')),
    warn: bgMagentaBright(white('WARN')),
    success: bgGreenBright(white('SUCCESS')),
    muted: '',
  }

  // Split in 75 letters
  const parts = message?.match(/.{1,75}/g) || []

  parts.forEach((v) => console.log(`${prefixes[type]} ${type === 'muted' ? gray(dim(v)) : white(v)}`))
}

module.exports = { feedback }
