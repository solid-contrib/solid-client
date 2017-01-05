'use strict'
/**
 * Provides convenience methods for graph manipulation.
 * Currently depends on RDFLib
 * @module graph-util
 */
module.exports.appendGraph = appendGraph
module.exports.parseGraph = parseGraph
module.exports.parseLinks = parseLinks
module.exports.serializeStatements = serializeStatements
module.exports.graphFromStatements = graphFromStatements
module.exports.statementToNT = statementToNT

var ALL_STATEMENTS = null

/**
 * Appends RDF statements from one graph object to another
 * @method appendGraph
 * @param toGraph {Graph} Graph object to append to
 * @param fromGraph {Graph} Graph object to append from
 */
function appendGraph (toGraph, fromGraph) {
  // var source = (docURI) ? rdf.sym(docURI) : undefined
  fromGraph.statementsMatching(ALL_STATEMENTS)
    .forEach(function (st) {
      toGraph.add(st.subject, st.predicate, st.object, st.why)
    })
}

/**
 * Converts a statement to string (if it isn't already), optionally slices off
 * the period at the end, and returns the statement.
 * @method statementToNT
 * @param statement {String|Statement} RDF Statement to be converted.
 * @param [excludeDot=false] {Boolean} Optionally slice off ending period.
 * @return {String}
 */
function statementToNT (statement, excludeDot) {
  if (typeof statement !== 'string') {
    // This is an RDF Statement. Convert to string
    statement = statement.toNT()
  }
  if (excludeDot && statement.endsWith('.')) {
    statement = statement.slice(0, -1)
  }
  return statement
}

/**
 * Converts a list of RDF statements into an rdflib Graph (Formula), and returns
 * it.
 * @method graphFromStatements
 * @param statements {Array<Statement>}
 * @return {Graph}
 */
function graphFromStatements (statements, rdf) {
  var graph = rdf.graph()
  statements.forEach(function (st) {
    graph.add(st)
  })
  return graph
}

/**
 * Parses a given graph, from text rdfSource, as a given content type.
 * Returns parsed graph.
 * @method parseGraph
 * @param baseUrl {String}
 * @param rdfSource {String} Text source code
 * @param contentType {String} Mime Type (determines which parser to use)
 * @return {Graph}
 */
function parseGraph (baseUrl, rdfSource, contentType, rdf) {
  var parsedGraph = rdf.graph()
  rdf.parse(rdfSource, parsedGraph, baseUrl, contentType)
  return parsedGraph
}

/**
 * Extracts the URIs from a parsed graph that match parameters.
 * The URIs are a set (duplicates are removed)
 * @method parseLinks+
 * @param graph {Graph}
 * @param subject {Symbol}
 * @param predicate {Symbol}
 * @param object {Symbol}
 * @param source {Symbol}
 * @return {Array<String>} Array of link URIs that match the parameters
 */
function parseLinks (graph, subject, predicate, object, source) {
  var links = {}
  var matches = graph.statementsMatching(subject,
    predicate, object, source)
  matches.forEach(function (match) {
    links[match.object.uri] = true
  })
  return Object.keys(links)
}

/**
 * Serializes an array of RDF statements into a simple N-Triples format
 * suitable for writing to a solid server.
 * @method serializeStatements
 * @param statements {Array<Statement>} List of RDF statements
 * @return {String}
 */
function serializeStatements (statements) {
  var source = statements.map(function (st) { return st.toNT() })
  source = source.join('\n')
  return source
}
