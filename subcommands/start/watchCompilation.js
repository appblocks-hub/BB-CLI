const { createReadStream, watchFile } = require('fs')
const { Stream } = require('stream')
const readline = require('readline')
const path = require('path')

/**
 * @typedef watchCompilationReport
 * @property {[string]} errors
 * @property {string} message
 */
/**
 *
 * @param {} logPath Log file path to watch for
 * @param {*} errPath Log file path to watch for
 * @returns {Promise<watchCompilationReport>}
 */
const watchCompilation = (logPath, errPath) =>
  new Promise((resolve, reject) => {
    let ERROR = false
    const report = { errors: [] }
    const outStream = new Stream()
    watchFile(path.resolve(logPath), { persistent: false }, (currStat, prevStat) => {
      const inStream = createReadStream(path.resolve(logPath), {
        autoClose: false,
        encoding: 'utf8',
        start: prevStat.size,
        end: currStat.size,
      })
      const onLine = (line) => {
        if (line.includes('ERROR')) {
          ERROR = true
        } else if (ERROR) {
          report.errors.push(line)
          ERROR = false
        }
      }
      const onError = (err) => {
        report.errors.push(err.message.split('\n')[0])
        reject(report)
      }
      const onClose = () => {
        inStream.destroy()
        resolve(report)
      }
      const rl = readline.createInterface(inStream, outStream)
      rl.on('line', onLine)
      rl.on('error', onError)
      rl.on('close', onClose)
    })
    watchFile(path.resolve(errPath), { persistent: false }, (currStat, prevStat) => {
      const inStream = createReadStream(path.resolve(errPath), {
        autoClose: false,
        encoding: 'utf8',
        start: prevStat.size,
        end: currStat.size,
      })
      const onLine = (line) => {
        if (line.includes('[webpack-cli]') || line.includes('Error')) {
          report.errors.push(line)
        }
      }
      const onError = (err) => {
        report.errors.push(err.message.split('\n')[0])
        reject(report)
      }
      const onClose = () => {
        inStream.destroy()
        report.message = 'Webpack failed'
        resolve(report)
      }
      const rl = readline.createInterface(inStream, outStream)
      rl.on('line', onLine)
      rl.on('error', onError)
      rl.on('close', onClose)
    })
  })

module.exports = watchCompilation
