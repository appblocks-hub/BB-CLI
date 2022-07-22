/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { default: axios } = require('axios')
const parseLinkHeader = require('parse-link-header')
const { getGitRestHeaders } = require('./getHeaders')

const headers = getGitRestHeaders()

class GitPaginator {
  /**
   * Creates a github v3 api REST GitPaginator
   * @param {String} endpoint Git API endpoint Eg: 'user/repos'
   * @param {Function} picker A picker function to extract required data from response
   * @param {Object} opts Query options to be passed to REST API
   */
  constructor(endpoint, picker, opts) {
    this.baseUrl = 'https://api.github.com'
    this.endpoint = endpoint
    this.hasNext = false
    this.hasPrev = false
    this.totalPages = 0
    this.perPage = opts?.per_page || 20
    this.currentPage = opts?.page || 0
    this.picker = picker
  }

  static cache = {}

  /**
   *
   * @param {Number} page Page number
   */
  async getPage(page) {
    this.currentPage = page
    // check cache
    if (GitPaginator.cache[page]) {
      return GitPaginator.cache[page]
    }
    const res = await GitPaginator.makeCall.call(this)
    if (res.length === 0) {
      console.log('No organizations found!')
      process.exit(1)
    }
    if (this.hasPrev || this.hasNext) {
      GitPaginator.cache[page] = [
        { name: 'LoadPrev', disabled: !this.hasPrev },
        ...res,
        { name: 'LoadMore', disabled: !this.hasNext },
      ]
    } else {
      GitPaginator.cache[page] = res
    }
    return GitPaginator.cache[page]
  }

  /**
   * Generator that returns back each pages, assumes currentPage is 1
   */
  async *getPages() {
    this.hasNext = true
    this.currentPage = 1
    while (this.hasNext) {
      const res = await GitPaginator.makeCall.call(this)
      this.currentPage += 1
      yield res
    }
  }

  /**
   * Returns the new list
   * @returns {Array} Array mapped with provided picker
   */
  async nextPage() {
    if (this.currentPage === this.totalPages) return []
    this.currentPage += 1
    return this.getPage(this.currentPage)
  }

  async prevPage() {
    if (this.currentPage === 0) return []
    this.currentPage -= 1
    return this.getPage(this.currentPage)
  }

  async getAllPages() {
    const pages = []
    for await (const res of this.getPages()) {
      pages.push(...res)
    }
    return pages
  }

  static async makeCall() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.endpoint}`,

        { headers, params: { per_page: this.perPage, page: this.currentPage } }
      )
      const paginationdData = response.headers.link ? parseLinkHeader(response.headers.link) : {}
      this.hasNext = Object.hasOwnProperty.call(paginationdData, 'next')
      this.hasPrev = Object.hasOwnProperty.call(paginationdData, 'prev')
      this.totalPages = Object.hasOwnProperty.call(paginationdData, 'last') && parseInt(paginationdData.last.page, 10)
      return response.data.map(this.picker)
    } catch (e) {
      console.log('Something went wrong!', e)
      process.exit(1)
      return []
    }
  }
}

module.exports = GitPaginator
