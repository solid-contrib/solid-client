'use strict'
/**
 * Provides a generic wrapper around an RDF Parser library
 * (currently only RDFLib)
 *  @@ RDFLib is NOT JUST a parser library. It is a quadstore and a serializer library!
 * @module rdf-parser
 */
var RDFParser = {}
if (typeof $rdf !== 'undefined') {
  RDFParser.rdflib = $rdf // FF extension
} else if (typeof tabulator !== 'undefined') {
  RDFParser.rdflib = tabulator.rdf
} else if (typeof window !== 'undefined') {
  // Running inside the browser but NOT FF extension
  RDFParser.rdflib = window.$rdf
} else {
  // in Node.js
  RDFParser.rdflib = require('rdflib')
}
module.exports = RDFParser
