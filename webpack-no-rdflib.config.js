var path = require('path')

var config = require('./webpack.config')

// Exclude rdflib
config.externals['rdflib'] = '$rdf'

module.exports = config
