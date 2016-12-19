'use strict'
/**
 * Provides a generic wrapper around an RDF Parser library
 * (currently only RDFLib)
 *  @@ RDFLib is NOT JUST a parser library. It is a quadstore and a serializer library!
 * @module rdf-parser
 */
var rdf
if (typeof $rdf !== 'undefined') {
  rdf = $rdf // FF extension
} else if (typeof tabulator !== 'undefined') {
  rdf = tabulator.rdf
} else if (typeof require === 'function') {
  // Running with a CommonJS module system
  rdf = require('rdflib')
}
module.exports = rdf
