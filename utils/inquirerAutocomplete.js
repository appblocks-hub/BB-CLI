/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * `autocomplete` type prompt
 */

const ansiEscapes = require('ansi-escapes')
const chalk = require('chalk')
const figures = require('figures')
const Base = require('inquirer/lib/prompts/base')
const Choices = require('inquirer/lib/objects/choices')
const observe = require('inquirer/lib/utils/events')
const utils = require('inquirer/lib/utils/readline')
const Paginator = require('inquirer/lib/utils/paginator')
const runAsync = require('run-async')
const { takeWhile } = require('rxjs/operators')
// const fs = require("fs")
// const { logger } = require('./logger')
// const { ReadLine } = require("readline")

const isSelectable = (choice) => choice.type !== 'separator' && !choice.disabled

class AutocompletePrompt extends Base {
  /**
   * @constructor
   * @param {Array} questions Questions array
   * @param {ReadLine} rl
   * @param {Array} answers
   */
  constructor(questions, rl, answers) {
    super(questions, rl, answers)
    if (!this.opt.source) {
      this.throwParamError('source')
    }

    this.currentChoices = new Choices([])

    this.firstRender = true
    this.yetToType = true
    this.selected = 0

    // Make sure no default is set (so it won't be printed)
    this.initialValue = this.opt.default
    if (!this.opt.suggestOnly) {
      this.opt.default = null
    }

    const shouldLoop = this.opt.loop === undefined ? true : this.opt.loop
    this.paginator = new Paginator(this.screen, {
      isInfinite: shouldLoop,
    })
  }

  /**
   * Start the Inquiry session
   * @param  {Function} cb      Callback when prompt is done
   * @return {this}
   */
  // eslint-disable-next-line no-underscore-dangle
  _run(cb /*: Function */) /*: this */ {
    this.done = cb

    if (this.rl.history instanceof Array) {
      this.rl.history = []
    }

    const events = observe(this.rl)

    const dontHaveAnswer = () => this.answer === undefined

    events.line
      .pipe(takeWhile(dontHaveAnswer))
      // To avoid getting undefined answer if
      // user clicks enter while searching is on
      .pipe(takeWhile(() => this.searching === false))
      .forEach(this.onSubmit.bind(this))
    events.keypress.pipe(takeWhile(dontHaveAnswer)).forEach(this.onKeypress.bind(this))

    // Call once at init
    this.search(undefined)

    return this
  }

  /**
   * Render the prompt to screen
   * @return {undefined}
   */
  render(error /*: ?string */) {
    // Render question
    let content = this.getQuestion()
    let bottomContent = ''

    if (this.firstRender) {
      const suggestText = this.opt.suggestOnly ? ', tab to autocomplete' : ''
      content += chalk.dim(`(Use arrow keys or type to search${suggestText})`)
    }
    // Render choices or answer depending on the state
    if (this.status === 'answered') {
      content += chalk.cyan(this.shortAnswer || this.answerName || this.answer)
    } else if (this.searching) {
      content += this.rl.line
      bottomContent += `  ${chalk.dim(this.opt.searchText || 'Searching...')}`
    } else if (this.yetToType) {
      bottomContent += `  ${chalk.dim('start typing...')}`
    } else if (this.nbChoices) {
      const choicesStr = listRender(this.currentChoices, this.selected)
      content += this.rl.line
      const indexPosition = this.selected
      let realIndexPosition = 0
      this.currentChoices.choices.every((choice, index) => {
        if (index > indexPosition) {
          return false
        }
        const { name } = choice
        realIndexPosition += name ? name.split('\n').length : 0
        return true
      })
      bottomContent += this.paginator.paginate(choicesStr, realIndexPosition, this.opt.pageSize)
    } else {
      content += this.rl.line
      bottomContent += `  ${chalk.yellow(this.opt.emptyText || 'No results...')}`
    }

    if (error) {
      bottomContent += `\n${chalk.red('>> ')}${error}`
    }

    this.firstRender = false

    this.screen.render(content, bottomContent)
  }

  /**
   * When the user press enter
   * @param {String} line String or readline instance
   */
  onSubmit(line) {
    // logger.info('submitted')
    let lineOrRl = line || this.rl.line
    // logger.info(lineOrRl)
    // only set default when suggestOnly (behaving as input prompt)
    // list prompt does only set default if matching actual item in list
    if (this.opt.suggestOnly && !lineOrRl) {
      lineOrRl = this.opt.default === null ? '' : this.opt.default
    }

    if (typeof this.opt.validate === 'function') {
      const checkValidationResult = (validationResult) => {
        if (validationResult !== true) {
          this.render(validationResult || 'Enter something, tab to autocomplete!')
        } else {
          this.onSubmitAfterValidation(lineOrRl)
        }
      }

      let validationResult
      if (this.opt.suggestOnly) {
        validationResult = this.opt.validate(lineOrRl, this.answers)
      } else {
        const choice = this.currentChoices.getChoice(this.selected)
        validationResult = this.opt.validate(choice, this.answers)
      }

      if (isPromise(validationResult)) {
        validationResult.then(checkValidationResult)
      } else {
        checkValidationResult(validationResult)
      }
    } else {
      this.onSubmitAfterValidation(lineOrRl)
    }
  }

  onSubmitAfterValidation(line /* : string */) {
    let choice = {}
    if (this.nbChoices <= this.selected && !this.opt.suggestOnly) {
      this.rl.write(line)
      this.search(line)
      return
    }

    if (this.opt.suggestOnly) {
      choice.value = line || this.rl.line
      this.answer = line || this.rl.line
      this.answerName = line || this.rl.line
      this.shortAnswer = line || this.rl.line
      this.rl.line = ''
    } else if (this.nbChoices) {
      choice = this.currentChoices.getChoice(this.selected)
      if (choice.value === 'LoadMore') {
        this.search('', 'after')
        return
      }
      if (choice.value === 'LoadPrev') {
        this.search('', 'before')
        return
      }
      this.answer = choice.value
      this.answerName = choice.name
      this.shortAnswer = choice.short
    } else {
      this.rl.write(line)
      this.search(line)
      return
    }

    runAsync(this.opt.filter, (err, value) => {
      choice.value = value
      this.answer = value

      if (this.opt.suggestOnly) {
        this.shortAnswer = value
      }

      this.status = 'answered'
      // Rerender prompt
      this.render()
      this.screen.done()
      this.done(choice.value)
    })(choice.value)
  }

  search(s, p) {
    const searchTerm = s || 'A'
    const self = this
    self.selected = 0
    //  console.log('sera called-',arguments);
    // Only render searching state after first time
    if (self.searchedOnce) {
      self.searching = true
      self.currentChoices = new Choices([])
      self.render() // Now render current searching state
    } else {
      self.searchedOnce = true
    }

    self.lastSearchTerm = searchTerm

    let thisPromise
    try {
      const result = self.opt.source(self.answers, searchTerm, p)
      thisPromise = Promise.resolve(result)
    } catch (error) {
      thisPromise = Promise.reject(error)
    }

    // Store this promise for check in the callback
    self.lastPromise = thisPromise

    return thisPromise.then((choices) => {
      // If another search is triggered before the current search finishes, don't set results
      if (thisPromise !== self.lastPromise) return

      self.currentChoices = new Choices(choices)

      const realChoices = choices.filter(isSelectable)
      self.nbChoices = realChoices.length

      const selectedIndex = realChoices.findIndex(
        (choice) => choice === self.initialValue || choice.value === self.initialValue
      )

      if (selectedIndex >= 0) {
        self.selected = selectedIndex
      }

      self.searching = false
      self.render()
    })
  }

  ensureSelectedInRange() {
    const selectedIndex = Math.min(this.selected, this.nbChoices) // Not above currentChoices length - 1
    this.selected = Math.max(selectedIndex, 0) // Not below 0
  }

  /**
   * When user type
   */

  onKeypress(e /* : {key: { name: string, ctrl: boolean }, value: string } */) {
    let len
    const keyName = (e.key && e.key.name) || undefined

    if (keyName === 'tab' && this.opt.suggestOnly) {
      if (this.currentChoices.getChoice(this.selected)) {
        this.rl.write(ansiEscapes.cursorLeft)
        const autoCompleted = this.currentChoices.getChoice(this.selected).value
        this.rl.write(ansiEscapes.cursorForward(autoCompleted.length))
        this.rl.line = autoCompleted
        this.render()
      }
    } else if (keyName === 'down' || (keyName === 'n' && e.key.ctrl)) {
      len = this.nbChoices
      this.selected = this.selected < len - 1 ? this.selected + 1 : 0
      this.ensureSelectedInRange()
      this.render()
      utils.up(this.rl, 2)
    } else if (keyName === 'up' || (keyName === 'p' && e.key.ctrl)) {
      len = this.nbChoices
      this.selected = this.selected > 0 ? this.selected - 1 : len - 1
      this.ensureSelectedInRange()
      this.render()
    } else {
      this.render() // Render input automatically
      // Only search if input have actually changed, not because of other keypresses
      const newLine = this.rl.line.trim()
      if (newLine) {
        this.yetToType = false
      } else {
        this.yetToType = true
      }
      if (this.lastSearchTerm !== newLine) {
        this.search(newLine) // Trigger new search
      }
    }
  }
}

/**
 * Function for rendering list choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
function listRender(choices, pointer /*: string */) /*: string */ {
  let output = ''
  let separatorOffset = 0

  choices.forEach((choice, i) => {
    if (choice.type === 'separator') {
      separatorOffset += 1
      output += `  ${choice}\n`
      return
    }

    if (choice.disabled) {
      separatorOffset += 1
      output += `  - ${choice.name}`
      output += ` (${typeof choice.disabled === 'string' ? choice.disabled : 'Disabled'})`
      output += '\n'
      return
    }

    const isSelected = i - separatorOffset === pointer
    let line = (isSelected ? `${figures.pointer} ` : '  ') + choice.name

    if (isSelected) {
      line = chalk.cyan(line)
    }
    output += `${line} \n`
  })

  return output.replace(/\n$/, '')
}

function isPromise(value) {
  return typeof value === 'object' && typeof value.then === 'function'
}

module.exports = AutocompletePrompt
