const path = require('path')
const { fromEvent, tap, take } = require('rxjs')
const { EventEmitter } = require('stream')
const WalkerProcess = require('./walker')
const { scan } = require('./fileAndFolderHelpers')

/**
 * @typedef {object} r
 * @property {String} parent
 * @property {Array} dirs
 * @property {Array} files
 */

class Finder {
  /**
   * @param {String} root
   * @param {Array<RegExp>} searchPatterns
   * @param {Number} mode
   * @param {Array<String>} ignoreDirsPattern
   * @param {Number} maxChildren
   */
  constructor(root, searchPatterns, mode, ignoreDirsPattern, maxChildren) {
    this.searchRegex = searchPatterns
    this.dirIgnore = ignoreDirsPattern || ['node_modules', '.git']
    this.checkagainst = 0
    this.mode = mode // 0 - match every pattern should be present, 1 - some of them should be present
    this.result = { dirs: [], files: [] }
    this.root = root || '.'
    this.maxChildren = maxChildren || 5
    this.tasks = []
    this.events = new EventEmitter()
  }

  async walk() {
    const { dirs } = await scan(path.resolve())
    dirs.forEach((v) => {
      this.tasks.push(new WalkerProcess(v, this.searchRegex, this.mode))
    })

    return new Promise((res, rej) => {
      if (this.tasks.length > 0) {
        // Start the tasks.
        // Start the max number of tasks
        let i = this.maxChildren
        while (this.tasks.length > 0 && i > 0) {
          this.tasks.pop().walk(this.events)
          i -= 1
        }
      }

      fromEvent(this.events, 'walked')
        .pipe(
          // All child dirs will be fed to walker, which will emit event once completed.
          take(dirs.length),
          tap(() => {
            if (this.tasks.length > 0) {
              // If there are more tasks to run, start them.
              this.tasks.pop().walk(this.events)
            }
          })
        )
        .subscribe({
          next: (n) => this.result.dirs.push(...n.dirs),
          complete: () => res(this.result),
          error: () => rej(this.result),
        })
    })
  }
}
module.exports = Finder

// async function sf() {
//   const f = new Finder(path.resolve(), ['.*.json$', '.*.txt$'], 1, ['mode_modules', '.git'], 12)
//   const g = await f.walk()
//   console.log(g, 'FINAL')
// }

// sf()
