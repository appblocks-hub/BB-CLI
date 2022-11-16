const { fork } = require('child_process')
const path = require('path')

class WalkerProcess {
  /**
   *
   * @param {EventListener} eventObject
   * @param {String} root
   * @param {Array} pattern
   * @param {Number} mode
   */
  constructor(root, pattern, mode) {
    this.result = { dirs: [] }
    this.pattern = pattern
    this.child = {}
    this.mode = mode
    this.root = root
  }

  walk(parentEvent) {
    const child = fork(path.join(__dirname, 'findProcess.js'), {})
    child.on('error', () => parentEvent.emit('walked'))
    child.on('exit', () => parentEvent.emit('walked', this.result))
    child.on('message', (m) => {
      this.result.dirs.push(...m.dirs)
    })
    child.send(this)
  }
}

module.exports = WalkerProcess
