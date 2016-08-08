var path = require('path')

var config = require('./webpack.config')

// Exclude rdflib
config.externals['rdflib'] = '$rdf'
config.output.filename = 'solid-client-lite.min.js'

module.exports = config
