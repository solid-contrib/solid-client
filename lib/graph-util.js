'use strict'
/**
 * Provides convenience methods for graph manipulation.
 * Currently depends on RDFLib
 * @module graph-util
 */
module.exports.appendGraph = appendGraph
module.exports.parseGraph = parseGraph

var rdf = require('./rdf-parser').rdflib

/**
 * Appends RDF statements from one graph object to another
 * @method appendGraph
 * @param toGraph {Graph} rdf.Graph object to append to
 * @param fromGraph {Graph} rdf.Graph object to append from
 * @param docURI {String} Document URI to use as source
 */
function appendGraph (toGraph, fromGraph, docURI) {
  var source = (docURI) ? rdf.sym(docURI) : undefined
  fromGraph.statementsMatching(undefined, undefined, undefined, source)
    .forEach(function (st) {
      toGraph.add(st.subject, st.predicate, st.object, st.why)
    })
}

/**
 * Parses a given graph, from text rdfSource, as a given content type.
 * Returns parsed graph.
 * @method parseGraph
 * @param baseUrl {String}
 * @param rdfSource {String} Text source code
 * @param contentType {String} Mime Type (determines which parser to use)
 * @return {rdf.Graph}
 */
function parseGraph (baseUrl, rdfSource, contentType) {
  var parsedGraph = rdf.graph()
  rdf.parse(rdfSource, parsedGraph, baseUrl, contentType)
  return parsedGraph
}
