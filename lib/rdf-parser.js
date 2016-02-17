'use strict'
/**
 * Provides a generic wrapper around an RDF Parser library
 * (currently only RDFLib)
 * @module rdf-parser
 */
var RDFParser = {}
if (typeof window !== 'undefined') {
  // Running inside the browser
  RDFParser.rdflib = window.$rdf
} else {
  // in Node.js
  RDFParser.rdflib = require('rdflib')
}
module.exports = RDFParser
