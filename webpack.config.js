var path = require('path')

module.exports = {
  entry: [
    './lib/index.js'
  ],
  output: {
    path: path.join(__dirname, '/dist/'),
    filename: 'solid-client.min.js',
    library: 'SolidClient',
    libraryTarget: 'var'
  },
  resolve: {
    modulesDirectories: ['node_modules'],
    fallback: path.join(__dirname, 'node_modules')
  },
  resolveLoader: { fallback: path.join(__dirname, 'node_modules') },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        loader: 'babel',
        query: {
          presets: ['es2015']
        }
      },
      {
        test: /\.json$/,
        loader: 'json'
      }
    ]
  },
  node: {
    fs: 'empty'
  },
  externals: {
    xhr2: 'XMLHttpRequest',
    xmlhttprequest: 'XMLHttpRequest'
  },
  devtool: 'source-map'
}
