'use strict'
/**
 * Provides a hashmap of relevant vocabs / namespaces
 * @module vocab
 */
var Vocab = {
  'DCT': 'http://purl.org/dc/terms/',
  'FOAF': {
    'primaryTopic': 'http://xmlns.com/foaf/0.1/primaryTopic'
  },
  'LDP': {
    'BasicContainer': 'http://www.w3.org/ns/ldp#BasicContainer',
    'NonRDFSource': 'http://www.w3.org/ns/ldp#NonRDFSource',
    'RDFSource': 'http://www.w3.org/ns/ldp#RDFSource',
    'Resource': 'http://www.w3.org/ns/ldp#Resource'
  },
  'OWL': {
    'sameAs': 'http://www.w3.org/2002/07/owl#sameAs'
  },
  'PIM': {
    'preferencesFile': 'http://www.w3.org/ns/pim/space#preferencesFile',
    'storage': 'http://www.w3.org/ns/pim/space#storage'
  },
  'RDF': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'RDFS': {
    'seeAlso': 'http://www.w3.org/2000/01/rdf-schema#seeAlso'
  },
  'SOLID': {
    'inbox': 'http://www.w3.org/ns/solid/terms#inbox',
    'publicTypeIndex': 'http://www.w3.org/ns/solid/terms#publicTypeIndex',
    'privateTypeIndex': 'http://www.w3.org/ns/solid/terms#privateTypeIndex'
  }
}

module.exports = Vocab
