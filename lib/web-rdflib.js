'use strict'
/**
 * Provides a wrapper for rdflib's web operations (`$rdf.Fetcher` based)
 * @module web-rdflib
 */
var $rdf = require('rdflib')

/**
 * @class rdflibWebClient
 * @static
 */
var rdflibWebClient = {
  /**
   * Retrieves a resource via HTTP, parses it, and returns the result.
   * @method getParsedGraph
   * @param url {String} URL of the resource or container to fetch
   * @return {Promise<Object>|Object}
   */
  getParsedGraph: function getParsedGraph (url, proxyUrl, timeout) {
    $rdf.Fetcher.crossSiteProxyTemplate = proxyUrl
    var promise = new Promise(function (resolve, reject) {
      var graph = $rdf.graph()
      var fetcher = new $rdf.Fetcher(graph, timeout)

      var docURI = (url.indexOf('#') >= 0)
        ? url.slice(0, url.indexOf('#'))
        : url
      fetcher.nowOrWhenFetched(docURI, undefined, function (ok, body, xhr) {
        if (!ok) {
          reject({status: xhr.status, xhr: xhr})
        } else {
          resolve(graph)
        }
      })
    })

    return promise
  }
}

module.exports = rdflibWebClient
