const extensionOf = (fname) =>
  // eslint-disable-next-line no-bitwise
  fname.slice(((fname.lastIndexOf('.') - 1) >>> 0) + 2)

module.exports = { extensionOf }
