const generateBabelRc = () => `
{
    "presets": ["@babel/preset-env", "@babel/preset-react"]
}
`
module.exports = { generateUiContainerBabelRc: generateBabelRc }
