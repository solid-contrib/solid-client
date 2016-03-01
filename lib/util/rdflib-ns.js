'use strict'
/**
 * Provides a namespace wrapper for RDFLib's symbols
 * @module web-rdflib
 */
module.exports = rdflibNamespace

var rdf = require('./rdf-parser').rdflib
var ns = require('rdf-ns')

/**
 * Accepts a namespace URI and returns a curried wrapper for 'rdf-ns'.
 * Usage:
 *
 *  ```
 *  var ns = require('./util/rdflib-ns')
 *  var rdfs = ns('http://www.w3.org/2000/01/rdf-schema#')
 *
 *  var seeAlso = rdfs('seeAlso')
 *  console.log(seeAlso)
 *  // -> rdf.Symbol(<http://www.w3.org/2000/01/rdf-schema#seeAlso>)
 *  ```
 */
function rdflibNamespace (namespaceUri) {
  var namespace = ns(namespaceUri)
  // Wrap the namespace object to return an rdf.Symbol
  var wrapper = function wrapper (term) {
    return rdf.sym(namespace(term))
  }
  return wrapper
}
