/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { default: axios } = require('axios')
const { appRegistryGetCategories } = require('./api')
const { getShieldHeader } = require('./getHeaders')

const getCategories = async (id) => {
  try {
    const postData = id
      ? {
          parent_category_id: id,
          is_parent: true,
        }
      : {}

    const categoriesRes = await axios.post(appRegistryGetCategories, postData, {
      headers: getShieldHeader(),
    })

    const categoriesList = categoriesRes.data.data.map((cat) => ({
      name: cat.category_name,
      value: cat.id,
      isParent: cat.descendant_count > 0,
    }))

    return categoriesList
  } catch (error) {
    return []
  }
}

module.exports = {
  getCategories,
}
