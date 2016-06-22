'use strict'
/**
 * Provides Solid helper functions involved with initializing, reading and
 * writing the App Registry resources.
 * @module app-registry
 */

module.exports.blankPrivateAppRegistry = blankPrivateAppRegistry
module.exports.blankPublicAppRegistry = blankPublicAppRegistry

var graphUtil = require('./util/graph-util.js')
var rdf = require('./util/rdf-parser').rdflib
var vocab = require('./vocab')

function blankPrivateAppRegistry () {
  var thisDoc = rdf.sym('')
  var registryStatements = [
    rdf.st(thisDoc, vocab.rdf('type'), vocab.solid('AppRegistry')),
    rdf.st(thisDoc, vocab.rdf('type'), vocab.solid('ListedDocument'))
  ]
  var registry = {
    data: graphUtil.serializeStatements(registryStatements),
    graph: graphUtil.graphFromStatements(registryStatements),
    slug: 'privateAppRegistry.ttl',
    uri: null  // actual url not yet known
  }
  return registry
}

function blankPublicAppRegistry () {
  var thisDoc = rdf.sym('')
  var registryStatements = [
    rdf.st(thisDoc, vocab.rdf('type'), vocab.solid('AppRegistry')),
    rdf.st(thisDoc, vocab.rdf('type'), vocab.solid('UnlistedDocument'))
  ]
  var registry = {
    data: graphUtil.serializeStatements(registryStatements),
    graph: graphUtil.graphFromStatements(registryStatements),
    slug: 'publicAppRegistry.ttl',
    uri: null  // actual url not yet known
  }
  return registry
}
