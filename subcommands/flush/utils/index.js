const path = require("path")

const extensionOf = (fname) =>
  // eslint-disable-next-line no-bitwise
  fname.slice(((fname.lastIndexOf('.') - 1) >>> 0) + 2)

const doesPathIncludeFolder = (filePath, folderName) => {
  const normalizedPath = path.normalize(filePath)
  const folders = normalizedPath.split(path.sep)

  return folders.includes(folderName)
}

module.exports = { extensionOf, doesPathIncludeFolder }
