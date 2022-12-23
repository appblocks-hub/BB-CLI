#!/usr/bin/env node

const path = require('path')
const { scan } = require('./fileAndFolderHelpers')

/**
 * @typedef {Object} pObj
 * @property {String} root
 * @property {[RegExp]} pattern
 * @property {Number} mode
 */
/**
 *
 * @param {pObj} param0
 * @param {*} depth
 * @returns
 */
async function start({ root, pattern, mode }, depth) {
  // console.log(`scanning in ${root} at depth ${depth} for ${pattern} with mode ${mode}`)

  const { dirs, files } = await scan(root)
  const promiseArray = []

  const ignoreDirs = ['node_modules', '.git']
  dirs.forEach((p) => {
    if (ignoreDirs.every((n) => !p.includes(n))) promiseArray.push(start({ root: p, pattern, mode }, depth + 1))
  })

  const b = await Promise.allSettled(promiseArray).then((bn) => bn)

  const fromChildren = b.reduce((acc, curr) => {
    if (curr.status === 'fulfilled') return acc.concat(curr.value.dirs)
    return acc
  }, [])

  // based on mode set predicate
  // if 0 => every pattern must match with atleast one file, for the dir to be selected
  // if 1 => atleast one pattern must match with atleast one file, for the dir to be selected
  const predicate = mode === 0 ? Array.prototype.every : Array.prototype.some
  const ov = predicate.apply(pattern, [(p) => files.some((f) => new RegExp(p).test(path.basename(f)))])

  if (depth === 0) {
    // If at the top of recursion, send result and exit
    process.send({ dirs: ov ? [root, ...fromChildren] : fromChildren })
    process.exit(0)
  }

  return { dirs: ov ? [root, ...fromChildren] : fromChildren }
}

process.once('message', (args) => {
  start(args, 0)
})
