const generateSharedFunctionIndex = (funcName) => `
const helper = () => 'I am common helper';

export default { helper }
`

module.exports = { generateSharedFunctionIndex }
