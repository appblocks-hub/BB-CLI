const generateBabelRc = () => `
{
    "presets": ["@babel/preset-env", "@babel/preset-react"]
}
`
module.exports = { generateUiElementBabelRc: generateBabelRc }
