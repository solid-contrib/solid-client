'use strict'
/**
 * @module registry
 */

module.exports.isListed = isListed
module.exports.isUnlisted = isUnlisted

var vocab = require('./vocab')

/**
 * Returns true if the parsed graph is a `solid:UnlistedDocument` document.
 * @method isUnlisted
 * @param graph {Graph} Parsed graph (loaded from a registry-like resource)
 * @return {Boolean}
 */
function isUnlisted (graph) {
  return graph.any(null, null, vocab.solid('UnlistedDocument'), graph.uri)
}

/**
 * Returns true if the parsed graph is a `solid:ListedDocument` document.
 * @method isListed
 * @param graph {Graph} Parsed graph (loaded from a registry-like resource)
 * @return {Boolean}
 */
function isListed (graph) {
  return graph.any(null, null, vocab.solid('ListedDocument'), graph.uri)
}
