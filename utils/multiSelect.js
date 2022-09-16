/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable class-methods-use-this */
const chalk = require('chalk')
const figures = require('figures')
const cliCursor = require('cli-cursor')
const Base = require('inquirer/lib/prompts/base')
const Choices = require('inquirer/lib/objects/choices')
const observe = require('inquirer/lib/utils/events')
const { map, takeUntil } = require('rxjs/operators')

// @ts-check
class CustomSelect extends Base {
  /**
   * Initialise the prompt
   *
   * @param  {Object} questions
   * @param  {Object} rl
   * @param  {Object} answers
   */
  constructor(questions, rl, answers) {
    super(questions, rl, answers)

    this.cursorY = 0
    this.cursorX = 0

    this.choiceStack = []

    this.customChoices = new Choices(this.opt.customChoices, [])
    this.choiceTree = this.opt.customChoices

    this.getSubChoice = this.opt.getSubChoice
    this.values = this.opt.customDefaultChoices || []
  }

  /**
   * Start the inquirer session
   *
   * @param  {Function} callback
   * @return {CustomSelect}
   */
  _run(callback) {
    this.done = callback

    const events = observe(this.rl)
    const validation = this.handleSubmitEvents(events.line.pipe(map(this.getCurrentValue.bind(this))))
    validation.success.forEach(this.onEnd.bind(this))
    validation.error.forEach(this.onError.bind(this))

    events.keypress.forEach(async ({ key }) => {
      switch (key.name) {
        case 'left':
          return this.onLeftKey()

        case 'right':
          return this.onRightKey()

        default:
          return null
      }
    })

    events.normalizedUpKey.pipe(takeUntil(validation.success)).forEach(this.onUpKey.bind(this))
    events.normalizedDownKey.pipe(takeUntil(validation.success)).forEach(this.onDownKey.bind(this))
    events.spaceKey.pipe(takeUntil(validation.success)).forEach(this.onSpaceKey.bind(this))

    if (this.rl.line) {
      this.onKeypress()
    }

    cliCursor.hide()
    this.render()

    return this
  }

  getCurrentValue() {
    return this.values
  }

  offsetYForXMovement() {
    const maxCursorY = this.customChoices.realLength
    if (maxCursorY <= this.cursorY) this.cursorY = maxCursorY - 1
  }

  onSpaceKey() {
    const { value } = this.customChoices.choices[this.cursorY]
    const index = this.values.indexOf(value)
    let parentIndex = -1
    let parentValue = ''

    const isParentSelected = this.values.some((v) =>
      this.choiceStack.some(({ parentValue: pv }, i) => {
        if (pv !== v) return false
        parentIndex = i
        parentValue = pv
        return true
      })
    )

    if (isParentSelected) {
      const updateValue = this.values.slice(0)
      this.choiceStack.slice(parentIndex + 1).forEach((choice) => {
        choice.customChoices.forEach((c) => {
          if (c.value !== choice.parentValue) {
            updateValue.push(c.value)
          } else {
            const ci = updateValue.indexOf(c.value)
            if (ci > -1) updateValue.splice(ci, 1)
          }
        })
      })

      if (parentValue) {
        const pi = updateValue.indexOf(parentValue)
        if (pi > -1) updateValue.splice(pi, 1)
      }

      this.customChoices.forEach((c) => {
        if (c.value !== value) updateValue.push(c.value)
      })

      this.values = updateValue
    } else if (index > -1) {
      this.values.splice(index, 1)
    } else {
      // Do check if all siblings are selected

      const isAllSelected = this._isAllSelected(this.customChoices, value)

      if (isAllSelected) {
        const cStack = this.choiceStack.slice(0).reverse()
        const updateValue = this.values.slice(0)

        let isBreak = false
        cStack.forEach((choice) => {
          if (isBreak) return

          if (this._isAllSelected(choice.customChoices, choice.parentValue, updateValue)) {
            choice.customChoices.forEach((c) => {
              const ci = updateValue.indexOf(c.value)
              if (ci > -1) updateValue.splice(ci, 1)
            })
          } else {
            updateValue.push(choice.parentValue)
            isBreak = true
          }
        })

        this.customChoices.forEach((c) => {
          const ci = updateValue.indexOf(c.value)
          if (ci > -1) updateValue.splice(ci, 1)
        })

        this.values = updateValue
      } else {
        this.values.push(value)
      }
    }

    this.spaceKeyPressed = true
    this.render()
  }

  _isAllSelected(arr, cur, val = null) {
    const values = val || this.values.slice(0)
    return this._toArray(arr).every((c) => c.value === cur || values.includes(c.value))
  }

  onUpKey() {
    this.cursorY = this.cursorY > 0 ? this.cursorY - 1 : this.cursorY
    this.offsetYForXMovement()
    this.render()
  }

  onDownKey() {
    const length = this.customChoices.realLength
    this.cursorY = this.cursorY < length - 1 ? this.cursorY + 1 : this.cursorY
    this.offsetYForXMovement()
    this.render()
  }

  onLeftKey() {
    const lastStack = this.choiceStack.pop()

    if (lastStack) {
      this.cursorY = lastStack.cursorY
      this.customChoices = lastStack.customChoices
    }

    this.render()
  }

  async onRightKey() {
    const { value, getSubChoice, isParent } = this.customChoices.choices[this.cursorY]
    if (!isParent) return

    this.choiceStack.push({
      cursorY: this.cursorY,
      customChoices: new Choices(this._toArray(this.customChoices)),
      parentValue: value,
    })
    this.cursorY = 0

    this.render(null, true)

    const customChoices = await this._getSubChoiceValue(getSubChoice, value)

    this.customChoices = new Choices(customChoices?.length < 1 ? this.choiceStack.pop() : customChoices, [])

    this.loading = false

    this.render()
  }

  onEnd(state) {
    this.status = 'answered'
    this.spaceKeyPressed = true

    this.render(null, false, true)

    this.screen.done()
    cliCursor.show()

    this.done(state.value)
  }

  onError(state) {
    this.render(state.isValid)
  }

  render(error, loading, done) {
    let message = this.getQuestion()
    let bottomContent = ''

    if (done) {
      message += `${chalk.cyan(this._findSelectedChoices(this.choiceTree).join(', '))}`
      this.screen.render(message)
      return
    }

    if (!this.spaceKeyPressed) {
      bottomContent += chalk.dim(
        `(Use ${chalk.cyan.bold('<up/down>')} to move choices, ${chalk.cyan.bold(
          '<left/right>'
        )} to minimize/expand, ${chalk.cyan.bold('<space>')} to select, and ${chalk.cyan.bold('<enter>')} to finish)`
      )
    }

    const level = this.choiceStack.length

    const table = loading
      ? `${'  '.repeat(level)}${chalk.dim(`...`)}`
      : this._toArray(this.customChoices)
          .map((choice, choiceIndex) => {
            const onValue = this.cursorY === choiceIndex

            const choiceText = choice.isParent ? `${choice.name} ${figures.arrowRight}` : `${choice.name}`

            const selectedValue =
              this.values.includes(choice.value) ||
              (level > 0 && this.values.some((v) => this.choiceStack.some(({ parentValue: pv }) => pv === v)))

            if (selectedValue === true) {
              if (onValue) {
                return `${'  '.repeat(level)}${chalk.cyan(`${figures.pointer}${figures.radioOn} ${choiceText}`)}`
              }
              return `${'  '.repeat(level)}${chalk.green.bold(` ${figures.radioOn} ${choiceText}`)}`
            }
            if (onValue) {
              return `${'  '.repeat(level)}${chalk.cyan(`${figures.pointer}${figures.radioOff} ${choiceText}`)}`
            }

            return `${'  '.repeat(level)}${chalk.dim(` ${figures.radioOff} ${choiceText}`)}`
          })
          .join('\n')

    message += this.choiceStack.length > 0 ? this._choiceList(table) : `\n${table}`

    if (error) {
      bottomContent = chalk.red('>> ') + error
    }

    this.screen.render(message, bottomContent)
  }

  _toArray(a) {
    return a.filter(() => true)
  }

  _choiceList = (table, index = 0) => {
    const { parentValue, customChoices } = this.choiceStack[index] || {}
    return customChoices.reduce((acc, c) => {
      let accValue = acc

      const isSelected =
        this.values.includes(c.value) ||
        this.values.some((v) => this.choiceStack.slice(0, index).some(({ parentValue: pv }) => pv === v))

      accValue += isSelected
        ? chalk.green.bold(`\n${'  '.repeat(index)}${figures.radioOn} ${c.name}`)
        : chalk.dim(`\n${'  '.repeat(index)}${figures.radioOff} ${c.name}`)

      const arrow = isSelected ? chalk.green.bold(figures.arrowLeft) : chalk.dim(figures.arrowLeft)

      if (parentValue === c.value) {
        if (this.choiceStack[index + 1]) {
          accValue += `  ${arrow} ${this._choiceList(table, index + 1)}`
        } else {
          accValue += `  ${arrow} \n${table}`
        }
      }

      return accValue
    }, '')
  }

  _buildTree(choicesTree, value, subChoicesList) {
    return choicesTree.map((tree) => {
      const treeVal = tree
      if (treeVal.value === value) {
        treeVal.subChoices = subChoicesList
      } else if (treeVal.subChoices?.length) {
        treeVal.subChoices = this._buildTree(treeVal.subChoices, value, subChoicesList)
      }

      return treeVal
    })
  }

  _findSubChoices(choices, value) {
    for (const choice of choices) {
      if (choice.value === value) {
        return choice.subChoices
      }

      if (choice.subChoices) {
        return this._findSubChoices(choice.subChoices, value)
      }
    }
    return []
  }

  _findSelectedChoices(choices) {
    return choices.reduce((acc, choice) => {
      let accValue = acc

      if (this.values.includes(choice.value)) {
        accValue.push(choice.name)
      } else if (choice.subChoices) {
        accValue = accValue.concat(this._findSelectedChoices(choice.subChoices))
      }

      return accValue
    }, [])
  }

  async _getSubChoiceValue(getSubChoice, value) {
    let subChoices = []
    if (this.choiceTree?.length > 0) {
      subChoices = this._findSubChoices(this.choiceTree, value)
    }

    if (subChoices?.length > 0) return subChoices

    subChoices = getSubChoice ? await getSubChoice(value) : await this.getSubChoice(value)
    this.choiceTree = this._buildTree(this.choiceTree.slice(0), value, subChoices)

    return subChoices
  }
}

module.exports = CustomSelect
