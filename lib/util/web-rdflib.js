'use strict'
/**
 * Provides a wrapper for rdflib's web operations (`rdf.Fetcher` based)
 * @module web-rdflib
 */
var rdf = require('./util/rdf-parser').rdflib

/**
 * @class rdflibWebClient
 * @static
 */
var rdflibWebClient = {
  /**
   * Retrieves a resource via HTTP, parses it, and returns the result.
   * @method getParsedGraph
   * @param url {String} URL of the resource or container to fetch
   * @param proxyUrl {String} URL template of the proxy to use for CORS
   *                          requests.
   * @param timeout {Number} Request timeout in milliseconds.
   * @param [suppressError=false] {Boolean} Resolve with a null graph on error
   *   if true, reject otherwise. Set to true when using `Promise.all()`
   * @return {Promise<Object>|Object}
   */
  getParsedGraph: function getParsedGraph (url, proxyUrl, timeout,
      suppressError) {
    rdf.Fetcher.crossSiteProxyTemplate = proxyUrl
    var promise = new Promise(function (resolve, reject) {
      var graph = rdf.graph()
      var fetcher = new rdf.Fetcher(graph, timeout)

      var docURI = (url.indexOf('#') >= 0)
        ? url.slice(0, url.indexOf('#'))
        : url
      fetcher.nowOrWhenFetched(docURI, undefined, function (ok, body, xhr) {
        if (!ok) {
          if (suppressError) {
            resolve(null)
          } else {
            reject({status: xhr.status, xhr: xhr})
          }
        } else {
          resolve(graph)
        }
      })
    }, function (error) {
      console.log('Error in getParsedGraph: %o', error)
    })

    return promise
  }
}

module.exports = rdflibWebClient
