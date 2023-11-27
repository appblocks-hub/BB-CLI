const chalk = require("chalk")
const { createReadStream } = require("fs")
const path = require("path")

const readLog = (logPath, start, end) => {
  const stream = createReadStream(logPath, { encoding: 'utf8', autoClose: false, start, end })
  const logFileName = path.basename(logPath)
  stream.on('data', (d) => {
    const logType = logPath.includes('/err/') ? 'Error' : 'Log'
    const logMsg = `\n${logFileName
      .replace('.log', '')
      .toUpperCase()} [${logType}] ${new Date().toLocaleString()} - ${logFileName}:\n\n${d.trim()}\n`
    if (logType === 'Error') console.log(chalk.red(logMsg))
    else console.log(logMsg)
  })
}

const readOldLog = (logPath, lines) => {
  const stream = createReadStream(logPath, { encoding: 'utf8', autoClose: false })
  const logFileName = path.basename(logPath)

  const chunkSize = 1024
  let buffer = ''

  stream.on('data', (data) => {
    buffer += data
    // Ensure buffer doesn't grow too large
    if (buffer.length > chunkSize * 2) {
      buffer = buffer.slice(-chunkSize)
    }
  })

  stream.on('end', () => {
    const logDataLines = buffer.split('\n').filter((line) => line.trim() !== '')
    const lastNLines = logDataLines.slice(-lines).join('\n').trim()
    if (!lastNLines.length || lastNLines === '""') return
    const logType = logPath.includes('/err/') ? 'Error' : 'Log'
    const logMsg = `\n${logFileName
      .replace('.log', '')
      .toUpperCase()} [${logType}] ${new Date().toLocaleString()} - ${logFileName}:\n\n${lastNLines}\n`
    if (logType === 'Error') console.log(chalk.red(logMsg))
    else console.log(logMsg)
  })
}

module.exports = { readLog, readOldLog }
