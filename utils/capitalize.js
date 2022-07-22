/**
 * Capitalize string
 * @param {String} s String to convert
 * @returns String with first char uppercased
 */
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLocaleLowerCase()
}

module.exports = { capitalize }
