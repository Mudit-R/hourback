const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const isDev = process.env.NODE_ENV !== 'production';

module.exports = {
  mode: isDev ? 'development' : 'production',
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isDev ? '[name].js' : '[name].[contenthash].js',
    clean: true,
    publicPath: '/',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@hourback/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: {
                auto: true,
                namedExport: false,
                exportLocalsConvention: 'asIs',
                localIdentName: isDev ? '[name]__[local]--[hash:base64:5]' : '[hash:base64]',
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.REACT_APP_GRAPHQL_URL': JSON.stringify(process.env.REACT_APP_GRAPHQL_URL || '/graphql'),
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      title: 'HourBack — AI Progress Report Copilot',
    }),
    ...(isDev ? [] : [new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' })]),
  ],
  devServer: {
    port: 3000,
    historyApiFallback: true,
    hot: true,
    proxy: [{ context: ['/graphql'], target: 'http://localhost:4000' }],
  },
  devtool: isDev ? 'eval-source-map' : 'source-map',
};
