'use strict'
/**
 * Provides a simple configuration object for Solid web client and other
 * modules.
 * @module config
 */
module.exports = {
  /**
   * Default RDF parser library
   */
  parser: 'rdflib',

  /**
   * Default proxy URL for servicing CORS requests
   */
  proxyUrl: 'https://databox.me/,proxy?uri={uri}',

  /**
   * Timeout for web/ajax operations, in milliseconds
   */
  timeout: 50000
}
