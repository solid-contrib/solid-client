'use strict'
/**
 * Provides a hashmap of relevant vocabs / namespaces.
 * Usage:
 *
 *   ```
 *   var solid = require('solid')
 *   var vocab = solid.vocab
 *   console.log(vocab.foaf('name'))  // -> <http://xmlns.com/foaf/0.1/name>
 *   ```
 * @module vocab
 */

var ns = require('./util/rdflib-ns')

var vocab = {
  'acl': ns('http://www.w3.org/ns/auth/acl#'),
  'app': ns('http://www.w3.org/ns/solid/app#'),
  'dcterms': ns('http://purl.org/dc/terms/'),
  'foaf': ns('http://xmlns.com/foaf/0.1/'),
  'ldp': ns('http://www.w3.org/ns/ldp#'),
  'owl': ns('http://www.w3.org/2002/07/owl#'),
  'pim': ns('http://www.w3.org/ns/pim/space#'),
  'rdf': ns('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
  'rdfs': ns('http://www.w3.org/2000/01/rdf-schema#'),
  'schema': ns('http://schema.org/'),
  'sioc': ns('http://rdfs.org/sioc/ns#'),
  'solid': ns('http://www.w3.org/ns/solid/terms#'),
  'vcard': ns('http://www.w3.org/2006/vcard/ns#'),
  'xsd': ns('http://www.w3.org/2001/XMLSchema#')
}

module.exports = vocab
