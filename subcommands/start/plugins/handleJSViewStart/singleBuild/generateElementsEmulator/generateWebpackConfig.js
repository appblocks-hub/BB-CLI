const generateWebpackConfig = (options) => {
  const { env, emPort, depLib,remoteFileName } = options || {}


  const rulesRegex = {
    'babel-loader': /\.(js|jsx|ts|tsx)$/,
    'url-loader': /\.(jpg|png|gif|svg|eot|svg|ttf|woff|woff2)$/,
    'style-loader': /\.css$/i,
    'sass-loader': /\.s[ac]ss$/i,
  }

  // eslint-disable-next-line no-template-curly-in-string
  const depLibUrl = '${process.env.BB_DEP_LIB_URL}'

  return `
import HtmlWebpackPlugin from 'html-webpack-plugin'
import ModuleFederationPlugin from 'webpack/lib/container/ModuleFederationPlugin.js'
import path from 'path'
import webpackPkg from 'webpack';
import exposedJson from './federation-expose.js'
import sharedJson from './federation-shared.js'
import * as dotenv from 'dotenv' 
import { fileURLToPath } from 'url';

const { DefinePlugin } = webpackPkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const Dotenv = dotenv.config({
  path: \`${env ? `./.env.${env}` : './.env'}\`,
})
const config = {
  entry: './src/index',
  mode: 'development',
  resolve: {
    symlinks: true,
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  devServer: {
    historyApiFallback: true,
    hot: true,
    static: path.join(__dirname,'dist', 'bootstrap.js'),
    port: ${emPort},
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers':
        'X-Requested-With, content-type, Authorization',
    },
  },
  target: 'web',
  output: {
    publicPath: 'auto',
    crossOriginLoading: 'anonymous',
  },
  optimization: {
    minimize: false,
  },
  module: {
    rules: [
      {
        test: ${rulesRegex['babel-loader']},
        loader: 'babel-loader',
        resolve:{
          fullySpecified:false
        },
        options: {
          presets: ['@babel/preset-env', '@babel/preset-typescript','@babel/preset-react'],
        },
      },
      {
        test: ${rulesRegex['url-loader']},
        use: {
          loader: 'url-loader',
        },
      },
      {
        test: ${rulesRegex['style-loader']},
        use: ['style-loader', 'css-loader'],
      },
      {
        test: ${rulesRegex['sass-loader']},
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              import: true,
              importLoaders: true
            }
          },
          'postcss-loader',
          'sass-loader'
        ]
      }
    ],
  },
  plugins: [
    new DefinePlugin({
      process: { env: JSON.stringify(Dotenv.parsed) },
    }),
    new ModuleFederationPlugin({
      name: 'remotes',
      filename: "${remoteFileName}",
      exposes: exposedJson,${
        depLib
          ? `
      remotes: {
        dep_lib: \`remotes@${depLibUrl}\`,
      },`
          : ''
      }
      shared: sharedJson,
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
}

export default config
`
}

module.exports = { generateWebpackConfig }
