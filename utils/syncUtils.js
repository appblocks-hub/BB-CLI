/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { confirmationPrompt } = require('./questionPrompts')

function hasDiff(object, property) {
  const testProperty = object[property]
  if (typeof testProperty !== 'object') return false
  if (Object.keys(testProperty).length !== 2) return false
  if (!testProperty.left || !testProperty.right) return false
  return true
}
function needAddition(object, property) {
  const testProperty = object[property]
  if (typeof testProperty !== 'object') return false
  if (!testProperty.left) return false
  return true
}
function needRemoval(object, property) {
  const testProperty = object[property]
  if (typeof testProperty !== 'object') return false
  if (!testProperty.right) return false
  return true
}

function displayColouredBlock(level, key, value, colour) {
  // console.log(level, key, value)
  if (typeof value === 'object') {
    console.log(colour(indentString(`${key} : {`, level)))
    for (const k in value) {
      if (Object.hasOwnProperty.call(value, k)) {
        const v = value[k]
        displayColouredBlock(level + 2, k, v, colour)
      }
    }
    console.log(colour(indentString(`}`, level)))
  } else {
    const s = `${key} : ${value}`
    console.log(colour(indentString(s, level)))
  }
}

function indentString(string, count = 1, options = {}) {
  const { indent = ' ', includeEmptyLines = false } = options

  if (typeof string !== 'string') {
    throw new TypeError(`Expected \`input\` to be a \`string\`, got \`${typeof string}\``)
  }

  if (typeof count !== 'number') {
    throw new TypeError(`Expected \`count\` to be a \`number\`, got \`${typeof count}\``)
  }

  if (count < 0) {
    throw new RangeError(`Expected \`count\` to be at least 0, got \`${count}\``)
  }

  if (typeof indent !== 'string') {
    throw new TypeError(`Expected \`options.indent\` to be a \`string\`, got \`${typeof indent}\``)
  }

  if (count === 0) {
    return string
  }

  const regex = includeEmptyLines ? /^/gm : /^(?!\s*$)/gm

  return string.replace(regex, indent.repeat(count))
}

function t(d) {
  console.log('{')
  ;(function ti(di, level) {
    const l = level + 2
    for (const key in di) {
      if (Object.hasOwnProperty.call(di, key)) {
        const df = di[key]
        if (hasDiff(di, key)) {
          if (typeof df.left === 'object') {
            console.log(indentString(`${key} : {`, l))
            ti(df, l)
          }
          if (typeof df.right === 'object') {
            console.log(indentString(`${key} : {`, l))
            ti(df, l)
          }
          console.log(
            indentString(
              `${key} : ${chalk.bgRed(di[key].right ? di[key].right : "' '")}-->${chalk.bgGreen(
                di[key].left ? di[key].left : "' '"
              )}`,
              l
            )
          )
        } else if (needAddition(di, key)) {
          // console.log(chalk.bgGreen(JSON.stringify(di[key])))
          displayColouredBlock(l, key, df.left, chalk.bgGreen)
        } else if (needRemoval(di, key)) {
          // console.log(chalk.bgRed(JSON.stringify(di[key])))
          displayColouredBlock(l, key, df.right, chalk.bgRed)
        } else if (typeof df === 'object') {
          console.log(indentString(`${key} : {`, l))
          ti(df, l)
        } else {
          console.log(indentString(`${key} : ${df}`, l))
        }
      }
    }
    console.log('}'.padStart(l, ' '))
  })(d, 0)
  console.log('}')
}
const showPath = (arr) => (arr.length === 0 ? 'config' : arr.join(' -> '))
async function manualMerge(diffed, keypathArray = []) {
  // based on option, either merge, or only add or only remove
  const temp = {}
  for (const key in diffed) {
    if (Object.hasOwnProperty.call(diffed, key)) {
      const v = diffed[key]
      if (hasDiff(diffed, key)) {
        const change = await confirmationPrompt({
          name: 'change',
          message: `Do you want to change\n${chalk.bgGray(v.right)} to 
          \n${chalk.bgGreen(JSON.stringify(v.left, null, 2))}\n in ${showPath(keypathArray)}`,
        })
        temp[key] = change ? v.left : v.right
        // console.log('HAS DIFF')
        // console.log(key)
        // console.log(keypathArray.join(' -> '))
        // console.log(v)
        // temp[key] = v.right
      } else if (needAddition(diffed, key)) {
        const add = await confirmationPrompt({
          name: 'add',
          message: `Do you want to add\n${chalk.bgGreen(`${key}:${JSON.stringify(v.left, null, 2)}`)} in \n${showPath(
            keypathArray
          )}`,
        })
        if (add) temp[key] = v.left
        // console.log('NEEDS ADDITION')
        // console.log(keypathArray.join(' -> '))
        // console.log(key)
        // console.log(v)
        // temp[key] = v.left
      } else if (needRemoval(diffed, key)) {
        const remove = await confirmationPrompt({
          name: 'remove',
          message: `Do you want to remove\n${chalk.bgGreen(
            `${key}:${JSON.stringify(v.right, null, 2)}`
          )} from \n${showPath(keypathArray)}`,
        })
        if (!remove) temp[key] = v.right
        // console.log('NEEDS REMOVAL')
        // console.log(keypathArray.join(' -> '))
        // console.log(v)
        // temp[key] = v.right
      } else if (typeof v === 'object') {
        temp[key] = await manualMerge(v, keypathArray.concat(key))
      } else {
        temp[key] = v
      }
    }
  }
  return temp
}
module.exports = {
  manualMerge,
  hasDiff,
  diffShower: t,
}
