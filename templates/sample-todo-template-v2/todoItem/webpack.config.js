import HtmlWebpackPlugin from 'html-webpack-plugin'
import path from 'path'
import webpack from 'webpack'
import exposed from './federation-expose.js'
import sharedDependencies from './federation-shared.js'

const ModuleFederationPlugin = webpack.container.ModuleFederationPlugin

import { env } from '@appblocks/node-sdk'
env.init()

const __dirname = path.resolve()

const port = 3000

export default {
  entry: './src/index',
  mode: 'development',
  devServer: {
    static: path.join(__dirname, 'dist'),
    port,
  },
  externals: {
    env: JSON.stringify(process.env),
  },
  output: {
    publicPath: 'auto',
  },
  module: {
    rules: [
      {
        test: /.js$/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-react'],
        },
      },
      {
        test: /.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /.m?js/,
        type: 'javascript/auto',
      },
      {
        test: /.m?js/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /.(jpg|png|svg)$/,
        use: {
          loader: 'url-loader',
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env),
    }),
    new ModuleFederationPlugin({
      name: 'todoItem',
      filename: 'remoteEntry.js',
      exposes: exposed,
      shared: sharedDependencies,
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
}
