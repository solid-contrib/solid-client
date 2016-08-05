'use strict'
/**
 * @module registry
 */

module.exports.isListed = isListed
module.exports.isUnlisted = isUnlisted

var vocab = require('solid-namespace')

/**
 * Returns true if the parsed graph is a `solid:UnlistedDocument` document.
 * @method isUnlisted
 * @param graph {Graph} Parsed graph (loaded from a registry-like resource)
 * @return {Boolean}
 */
function isUnlisted (graph, rdf) {
  var ns = vocab(rdf)
  return graph.any(null, null, ns.solid('UnlistedDocument'), graph.uri)
}

/**
 * Returns true if the parsed graph is a `solid:ListedDocument` document.
 * @method isListed
 * @param graph {Graph} Parsed graph (loaded from a registry-like resource)
 * @return {Boolean}
 */
function isListed (graph, rdf) {
  var ns = vocab(rdf)
  return graph.any(null, null, ns.solid('ListedDocument'), graph.uri)
}
