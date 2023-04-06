const { exec } = require('child_process')

function pexec(cmd, options, data = null) {
  return new Promise((resolve) => {
    exec(cmd, options, (error, stdout, stderr) => {
      if (error) {
        resolve({ err: stderr.toString(), out: stdout.toString(), data })
        return
      }
      resolve({ err: null, out: stdout.toString(), data })
    })
  })
}

module.exports = { pexec }
