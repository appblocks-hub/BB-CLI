const chalk = require('chalk')

const logFail = (msg) => console.log(chalk.red(msg))

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const isEmptyObject = (obj) => obj == null || typeof obj !== 'object' || Object.keys(obj).length === 0

const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/

module.exports = { logFail, sleep, isEmptyObject, domainRegex }
