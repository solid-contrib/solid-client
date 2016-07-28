'use strict'
/**
 * Provides a Solid web client class for performing LDP CRUD operations.
 * @module web
 */
var config = require('../config')
var graphUtil = require('./util/graph-util')
var SolidResponse = require('./models/response')
var SolidContainer = require('./models/container')
var vocab = require('./vocab')
var XMLHttpRequest = require('./util/xhr')
var HttpError = require('standard-http-error')

/**
 * Provides a collection of Solid/LDP web operations (CRUD)
 * @class SolidWebClient
 * @static
 */
var SolidWebClient = {
  /**
   * Creates a Solid container with the specified name.
   * Uses PUT instead of POST to guarantee the container name (and uses
   * conditional HTTP headers to fail with a `409 Conflict` error if
   * a container with that name already exists).
   * @method createContainer
   * @param parentUrl {String} Parent directory/container in which to create
   * @param name {String} Container name (slug / URL fragment), no trailing
   *   slash needed.
   * @param [options] Options hashmap (optional, see `solidRequest()`)
   * @param [data] {String} Optional RDF data payload (additional triples
   *   that will be added to the container's metadata)
   * @throw {HttpError} Throws an error if a resource or container with the
   *   same name already exists
   * @return {Promise<SolidResponse>}
   */
  createContainer: function createContainer (parentUrl, name, options, data) {
    return this.post(parentUrl, data, name, true)
    // var newContainerUrl = parentUrl + name
    // options = options || {}
    // options.headers = options.headers || {}
    // options.headers['If-None-Match'] = '*'
    // var resourceType = vocab.ldp('BasicContainer')
    // options.headers['Link'] = resourceType + '; rel="type"'
    // var mimeType = 'text/turtle'
    // return this.put(newContainerUrl, data, mimeType, options)
    //  .catch(function (error) {
    //    if (error instanceof HttpError) {
    //      if (error.code === HttpError.CONFLICT) {
    //        error.message = 'A resource with the same name already exists'
    //      } else if (error.code === HttpError.PRECONDITION_FAILED) {
    //        error.message = 'A container with the same name already exists'
    //      }
    //      throw error
    //    }
    //  })
  },

  /**
   * Creates and returns the appropriate Solid wrapper for the XHR response.
   * @method createResponse
   * @param xhrResponse {XMLHttpRequest} XHR Response
   * @param method {String} HTTP verb
   * @return {SolidResponse|SolidContainer} Either a SolidResponse or a
   *   SolidContainer instance.
   */
  createResponse: function createResponse (xhrResponse, method) {
    var response = new SolidResponse(xhrResponse, method)
    if (response.method === 'get' && response.isContainer()) {
      return new SolidContainer(response.location, response)
    }
    return response
  },

  /**
   * Returns the current window's location (for use with `needsProxy()`)
   * if used in browser, or `null` if used from Node.
   * @method currentUrl
   * @return {String|Null}
   */
  currentUrl: function currentUrl () {
    if (typeof window !== 'undefined') {
      return window.location.href
    } else {
      return null
    }
  },

  /**
   * Determines whether the web client needs to fall back onto a Proxy url,
   * to avoid being blocked by CORS
   * @method needsProxy
   * @param url {String}
   * @return {Boolean}
   */
  needsProxy: function needsProxy (url) {
    var currentUrl = this.currentUrl()
    var currentIsHttps = currentUrl && currentUrl.slice(0, 6) === 'https:'
    var targetIsHttp = url && url.slice(0, 5) === 'http:'
    return currentIsHttps && targetIsHttp
  },

  /**
   * Turns a given URL into a proxied version, using a proxy template
   * @method proxyUrl
   * @param url {String} Intended URL
   * @param proxyUrlTemplate {String}
   * @return {String}
   */
  proxyUrl: function proxyUrl (url, proxyUrlTemplate) {
    proxyUrlTemplate = proxyUrlTemplate || config.proxyUrl
    return proxyUrlTemplate.replace('{uri}', encodeURIComponent(url))
  },

  /**
   * Sends a generic XHR request with the appropriate Solid headers,
   * and returns a promise that resolves to a parsed response.
   * @method solidRequest
   * @param url {String} URL of the request
   * @param method {String} HTTP Verb ('GET', 'PUT', etc)
   * @param [options] Options hashmap
   * @param [options.noCredentials=false] {Boolean} Don't use `withCredentials`
   * @param [options.forceProxy=false] {Boolean} Enforce using proxy URL if true
   * @param [options.headers={}] {Object} HTTP headers to send along
   *          with request
   * @param [options.proxyUrl=config.proxyUrl] {String} Proxy URL to use for
   *          CORS Requests.
   * @param [options.timeout=config.timeout] {Number} Request timeout in
   *          milliseconds.
   * @param [data] {Object} Optional data / payload
   * @throws {HttpError} Rejects with `httpError.HttpError` of the appropriate
   *   type
   * @return {Promise<SolidResponse>}
   */
  solidRequest: function solidRequest (url, method, options, data) {
    options = options || {}
    options.headers = options.headers || {}
    options.proxyUrl = options.proxyUrl || config.proxyUrl
    options.timeout = options.timeout || config.timeout
    if (this.needsProxy(url) || options.forceProxy) {
      url = this.proxyUrl(url)
    }
    var webClient = this
    return new Promise(function (resolve, reject) {
      var http = new XMLHttpRequest()
      http.open(method, url)
      if (!options.noCredentials) {
        http.withCredentials = true
      }
      for (var header in options.headers) {  // Add in optional headers
        http.setRequestHeader(header, options.headers[header])
      }
      if (options.timeout) {
        http.timeout = options.timeout
      }
      http.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          resolve(webClient.createResponse(this, method))
        } else {
          reject(new HttpError(this.status, this.statusText, {xhr: this}))
        }
      }
      http.onerror = function () {
        reject(new HttpError(this.status, this.statusText, {xhr: this}))
      }
      if (typeof data === 'undefined' || !data) {
        http.send()
      } else {
        http.send(data)
      }
    })
  },

  /**
   * Checks to see if a Solid resource exists, and returns useful resource
   *   metadata info.
   * @method head
   * @param url {String} URL of a resource or container
   * @param [options] Options hashmap
   * @param [options.headers] {Object} HTTP headers to send along with request
   * @param [options.proxyUrl=config.proxyUrl] {String} Proxy URL to use for
   *          CORS Requests.
   * @param [options.timeout=config.timeout] {Number} Request timeout in
   *          milliseconds.
   * @return {Promise} Result of an HTTP HEAD operation (returns a meta object)
   */
  head: function head (url, options) {
    return this.solidRequest(url, 'HEAD', options)
  },

  /**
   * Retrieves a resource or container by making an HTTP GET call.
   * @method get
   * @param url {String} URL of the resource or container to fetch
   * @param [options] Options hashmap
   * @param [options.headers] {Object} HTTP headers to send along with request
   * @param [options.proxyUrl=config.proxyUrl] {String} Proxy URL to use for
   *          CORS Requests.
   * @param [options.timeout=config.timeout] {Number} Request timeout in
   *          milliseconds.
   * @return {Promise<SolidResponse|SolidContainer>|Object} Result of the HTTP
   *   GET operation, or an error object
   */
  get: function get (url, options) {
    options = options || {}
    options.headers = options.headers || {}
    // If no explicit Accept: header specified, set one
    if (!options.headers['Accept']) {
      options.headers['Accept'] =
        'text/turtle;q=0.8,*/*;q=0.5'
    }
    return this.solidRequest(url, 'GET', options)
  },

  /**
   * Lists the contents of a Solid Container.
   * (Deprecated, use `web.get()` instead.)
   * @method list
   * @deprecated
   * @param url {String} Url of the container to list
   * @param [options] Options hashmap, see docs for `solidResponse()`
   * @return {Promise<SolidContainer>}
   */
  list: function list (url, options) {
    console.warn('web.list() is deprecated. Use web.get() instead.')
    if (typeof url !== 'string') {
      throw new Error('Invalid url passed to list()')
    }
    // Make sure the container url ends in a /
    var urlNotEmpty = url !== ''
    var noEndingSlash = !url.endsWith('/')
    if (urlNotEmpty && noEndingSlash) {
      url = url + '/'
    }
    options = options || {}
    options.headers = options.headers || {}
    if (!options.headers['Accept']) {
      options.headers['Accept'] = 'text/turtle'
    }
    return this.get(url, options)
      .then(function (result) {
        return new SolidContainer(url, result)
      })
  },

  /**
   * Loads a list of given RDF graphs via an async `Promise.all()`,
   * which resolves to an array of uri/parsed-graph hashes.
   * @method loadParsedGraphs
   * @param locations {Array<String>} Array of graph URLs to load
   * @param [options] Options hashmap
   * @param [options.forceProxy=false] {Boolean} Enforce using proxy URL if true
   * @param [options.headers={}] {Object} HTTP headers to send along
   *          with request
   * @param [options.proxyUrl=config.proxyUrl] {String} Proxy URL to use for
   *          CORS Requests.
   * @param [options.timeout=config.timeout] {Number} Request timeout in
   *          milliseconds.
   * @return {Promise<Array<Object>>}
   */
  loadParsedGraphs: function loadParsedGraphs (locations, options) {
    var web = this
    var loadPromises = locations.map(function (location) {
      return web.get(location, options)
        .then(function (response) {
          var contentType = response.contentType()
          return graphUtil.parseGraph(location, response.raw(), contentType)
        })
        .catch(function () {
          // Suppress the error, no need to reject, just return null graph
          return null
        })
        .then(function (parsedGraph) {
          return {
            uri: location,
            value: parsedGraph
          }
        })
    })
    return Promise.all(loadPromises)
  },

  /**
   * Issues an HTTP OPTIONS request. Useful for discovering server capabilities
   * (`Accept-Patch:`, `Updates-Via:` for websockets, etc).
   * @method head
   * @param url {String} URL of a resource or container
   * @return {Promise} Result of an HTTP HEAD operation (returns a meta object)
   */
  options: function options (url) {
    return this.solidRequest(url, 'OPTIONS')
  },

  /**
   * Retrieves a resource via HTTP, parses it using the default parser
   * specified in `config.parser`, and returns the result.
   * @method getParsedGraph
   * @param url {String} URL of the resource or container to fetch
   * @param proxyUrl {String} URL template of the proxy to use for CORS
   *                          requests. Defaults to `config.proxyUrl`.
   * @param timeout {Number} Request timeout in milliseconds.
   *                         Defaults to `config.timeout`.
   * @param [suppressError=false] {Boolean} Resolve with a null graph on error
   *   if true, reject otherwise. Set to true when using `Promise.all()`
   * @return {Promise<Object>|Object}
   */
  getParsedGraph: function getParsedGraph (url, proxyUrl, timeout,
      suppressError) {
    proxyUrl = proxyUrl || config.proxyUrl
    timeout = timeout || config.timeout
    if (config.parser === 'rdflib') {
      var getParsedGraph = require('./util/web-rdflib').getParsedGraph
    } else {
      throw Error('Parser library not supported: ' + config.parser)
    }
    return getParsedGraph(url, proxyUrl, timeout, suppressError)
  },

  /**
   * Creates a new resource by performing
   *   a Solid/LDP POST operation to a specified container.
   * @param url {String} URL of the container to post to
   * @param data {Object} Data/payload of the resource to be created
   * @param slug {String} Suggested URL fragment for the new resource
   * @param isContainer {Boolean} Is the object being created a Container
   *            or Resource?
   * @param mimeType {String} Content Type of the data/payload
   * @method post
   * @return {Promise|Object} Result of XHR POST (returns parsed
   *     response meta object) or an anonymous error object with status code
   */
  post: function post (url, data, slug, isContainer, mimeType) {
    var resourceType
    if (isContainer) {
      resourceType = vocab.ldp('BasicContainer')
      mimeType = 'text/turtle' // Force the right mime type for containers only
    } else {
      resourceType = vocab.ldp('Resource')
      mimeType = mimeType || 'text/turtle'  // default to Turtle
    }
    var options = {}
    options.headers = {}
    options.headers['Link'] = resourceType + '; rel="type"'
    options.headers['Content-Type'] = mimeType
    if (slug && slug.length > 0) {
      options.headers['Slug'] = slug
    }
    return this.solidRequest(url, 'POST', options, data)
  },

  /**
   * Updates an existing resource or creates a new resource by performing
   *   a Solid/LDP PUT operation to a specified container
   * @method put
   * @param url {String} URL of the resource to be updated/created
   * @param data {Object} Data/payload of the resource to be created or updated
   * @param mimeType {String} MIME Type of the resource to be created
   * @param [options] Options hashmap, see docs for `solidResponse()`
   * @return {Promise|Object} Result of PUT operation (returns parsed response
   *     meta object if successful, rejects with an anonymous error status
   *     object if not successful)
   */
  put: function put (url, data, mimeType, options) {
    options = options || {}
    options.headers = options.headers || {}
    // options.headers['Link'] = '<' + resourceType + '>; rel="type"'
    options.headers['Content-Type'] = mimeType
    return this.solidRequest(url, 'PUT', options, data)
  },

  /**
   * Partially edits an RDF-type resource by performing a PATCH operation.
   *   Accepts arrays of individual statements (in Turtle format) as params.
   *   For example:
   *   [ '<a> <b> <c> .', '<d> <e> <f> .']
   * @method patch
   * @param url {String} URL of the resource to be edited
   * @param toDel {Array<String>} Triples to remove from the resource
   * @param toIns {Array<String>} Triples to insert into the resource
   * @param [options] Options hashmap
   * @return {Promise|Object} Result of PATCH operation (returns parsed response
   *     meta object if successful, rejects with an anonymous error status
   *     object if not successful)
   */
  patch: function patch (url, toDel, toIns, options) {
    var composePatchQuery = require('./util/web-util').composePatchQuery
    var data = composePatchQuery(toDel, toIns)
    var mimeType = 'application/sparql-update'
    options = options || {}
    options.headers = options.headers || {}
    // options.headers['Link'] = '<' + resourceType + '>; rel="type"'
    options.headers['Content-Type'] = mimeType
    return this.solidRequest(url, 'PATCH', options, data)
  },

  /**
   * Deletes an existing resource or container.
   * @method del
   * @param url {String} URL of the resource or container to be deleted
   * @return {Promise|Object} Result of the HTTP Delete operation (returns true
   *   on success, or an anonymous error object on failure)
   */
  del: function del (url) {
    return this.solidRequest(url, 'DELETE')
  }
}

// Alias some extra Solid web client methods
SolidWebClient.create = SolidWebClient.post
SolidWebClient.replace = SolidWebClient.put
SolidWebClient.update = SolidWebClient.patch
module.exports = SolidWebClient
