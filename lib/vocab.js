'use strict'
/**
 * Provides a hashmap of relevant vocabs / namespaces
 * @module vocab
 */
var Vocab = {
  'FOAF': {
    'primaryTopic': 'http://xmlns.com/foaf/0.1/primaryTopic'
  },
  'LDP': {
    'BasicContainer': 'http://www.w3.org/ns/ldp#BasicContainer',
    'NonRDFSource': 'http://www.w3.org/ns/ldp#NonRDFSource',
    'RDFSource': 'http://www.w3.org/ns/ldp#RDFSource',
    'Resource': 'http://www.w3.org/ns/ldp#Resource'
  },
  'PIM': {
    'preferencesFile': 'http://www.w3.org/ns/pim/space#preferencesFile',
    'storage': 'http://www.w3.org/ns/pim/space#storage'
  },
  'SOLID': {
    'inbox': 'http://www.w3.org/ns/solid/terms#inbox'
  }
}

module.exports = Vocab
