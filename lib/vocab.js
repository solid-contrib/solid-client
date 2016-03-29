'use strict'
/**
 * Provides a hashmap of relevant vocabs / namespaces
 * @module vocab
 */

var ns = require('./util/rdflib-ns')

var vocab = {
  'dct': ns('http://purl.org/dc/terms/'),
  'foaf': ns('http://xmlns.com/foaf/0.1/'),
  'ldp': ns('http://www.w3.org/ns/ldp#'),
  'owl': ns('http://www.w3.org/2002/07/owl#'),
  'pim': ns('http://www.w3.org/ns/pim/space#'),
  'rdf': ns('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
  'rdfs': ns('http://www.w3.org/2000/01/rdf-schema#'),
  'sioc': ns('http://rdfs.org/sioc/ns#'),
  'solid': ns('http://www.w3.org/ns/solid/terms#'),
  'vcard': ns('http://www.w3.org/2006/vcard/ns#'),
  'xsd': ns('http://www.w3.org/2001/XMLSchema#'),
  'acl': ns('http://www.w3.org/ns/auth/acl#')
}

module.exports = vocab
