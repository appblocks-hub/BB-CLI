/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = { blockLangInverter }
const { blockLangs } = require('./blockLangs')

function blockLangInverter(lang) {
  if (typeof lang === 'string') {
    const abLang=blockLangs[lang]
    if (abLang) return abLang

    throw new Error(`Language(${lang}) doesn't follow any predefined rules`)
  }
  throw new Error('Language must be a string')
}
