'use strict'
/**
* @module response
*/
module.exports = SolidResponse

var webUtil = require('../util/web-util')
var graphUtil = require('../util/graph-util')  // Used by .parsedGraph()

/**
* Provides a wrapper around an XHR response object, and adds several
* Solid-specific parsed fields (link headers, allowed verbs, etc)
* @class SolidResponse
* @constructor
* @param xhrResponse {XMLHttpRequest} Result of XHR operation
* @param method {String} HTTP verb for the original request
*/
function SolidResponse (xhrResponse, method) {
  if (!xhrResponse) {
    this.xhr = null
    this.user = ''
    this.method = null
    this.types = []
    this.graph = null
    return
  }
  /**
   * Hashmap of parsed `Link:` headers. Example:
   *
   *   ```
   *   {
   *     acl: [ 'resourceName.acl' ],
   *     describedBy: [ 'resourceName.meta' ],
   *     type: [
   *       'http://www.w3.org/ns/ldp#RDFResource',
   *       'http://www.w3.org/ns/ldp#Resource'
   *     ]
   *   }
   *   ```
   * @property linkHeaders
   * @type Object
   */
  var linkHeader = xhrResponse.getResponseHeader('Link')
  this.linkHeaders = webUtil.parseLinkHeader(linkHeader) || {}

  if (method) {
    method = method.toLowerCase()
  } else {
    method = ''
  }
  /**
   * HTTP verb for the original request (GET, PUT, etc)
   * @property method
   * @type String
   */
  this.method = method

  /**
   * Name of the corresponding `.acl` resource
   * @property acl
   * @type String
   */
  this.acl = this.linkHeaders['acl']
  if (this.acl) {
    this.acl = this.acl[0]  // Extract the single .acl link
  }
  /**
   * Hashmap of HTTP methods/verbs allowed by the server.
   * (If a verb is not allowed, it's not included.)
   * Example:
   *   ```
   *   {
   *     'get': true,
   *     'put': true
   *   }
   *   ```
   * @property allowedMethods
   * @type Object
   */
  this.allowedMethods = this.parseAllowedMethods(xhrResponse, method)

  /**
   * Cache of the parsed graph of xhr.response,
   * lazy-initialized when you call `response.parsedGraph()`
   * @property graph
   * @type {IndexedFormula}
   */
  this.graph = null

  /**
   * Name of the corresponding `.meta` resource
   * @property meta
   * @type String
   */
  this.meta = this.linkHeaders['meta'] || this.linkHeaders['describedBy']
  if (this.meta) {
    this.meta = this.meta[0]  // Extract the single .meta link
  }
  /**
   * LDP Types for the resource.
   * Example: [
   *   'http://www.w3.org/ns/ldp#Resource',
   *   'http://www.w3.org/ns/ldp#RDFResource'
   * ]
   * @property types
   * @type Array<String>
   */
  this.types = this.linkHeaders.type || []
  /**
  * URL of the resource created or retrieved
  * @property url
  * @type String
  */
  this.url = xhrResponse.getResponseHeader('Location') || xhrResponse.responseURL
  /**
   * WebID URL of the currently authenticated user (empty string if none)
   * @property user
   * @type String
   */
  this.user = xhrResponse.getResponseHeader('User') || ''
  /**
   * URL of the corresponding websocket instance, for this resource
   * Example: `wss://example.org/blog/hello-world`
   * @property websocket
   * @type String
   */
  this.websocket = xhrResponse.getResponseHeader('Updates-Via') || ''
  /**
   * Raw XHR response object
   * @property xhr
   * @type XMLHttpRequest
   */
  this.xhr = xhrResponse
}

/**
 * Returns the absolute URL of the ACL resource for this response.
 * @method aclAbsoluteUrl
 * @return {String}
 */
SolidResponse.prototype.aclAbsoluteUrl = function aclAbsoluteUrl () {
  if (!this.acl) {
    return this.acl
  }
  var aclAbsoluteUrl = webUtil.absoluteUrl(this.url, this.acl)
  return aclAbsoluteUrl
}

/**
 * Returns the Content-Type of the response (or null if no response
 * is present)
 * @method contentType
 * @return {String|Null}
 */
SolidResponse.prototype.contentType = function contentType () {
  if (this.xhr) {
    return this.xhr.getResponseHeader('Content-Type')
  } else {
    return null
  }
}

/**
 * Returns true if the resource exists (not a 404)
 * @method exists
 * @return {Boolean}
 */
SolidResponse.prototype.exists = function exists () {
  return this.xhr && this.xhr.status >= 200 && this.xhr.status < 400
}

/**
 * Is this a Container instance (vs a regular resource).
 * @return {Boolean}
 */
SolidResponse.prototype.isContainer = function isContainer () {
  return this.isType('http://www.w3.org/ns/ldp#Container') ||
    this.isType('http://www.w3.org/ns/ldp#BasicContainer')
}

/**
 * Returns true if the user is logged in with the server
 * @method isLoggedIn
 * @return {Boolean}
 */
SolidResponse.prototype.isLoggedIn = function isLoggedIn () {
  return this.user // && this.user.slice(0, 4) === 'http'
}

/**
 * Returns true if this a given type matches this resource's types
 * @method isType
 * @param rdfClass {String}
 * @return {Boolean}
 */
SolidResponse.prototype.isType = function isType (rdfClass) {
  return this.types.indexOf(rdfClass) !== -1
}

/**
 * Returns the absolute URL of the .meta resource for this response.
 * @method metaAbsoluteUrl
 * @return {String}
 */
SolidResponse.prototype.metaAbsoluteUrl = function metaAbsoluteUrl () {
  if (!this.meta) {
    return this.meta
  }
  var metaAbsoluteUrl = webUtil.absoluteUrl(this.url, this.meta)
  return metaAbsoluteUrl
}

/**
 * In case that this was preflight-type request (OPTIONS or POST, for example),
 * parses and returns the allowed methods for the resource (for the current
 * user).
 * @method parseAllowedMethods
 * @param xhrResponse {XMLHttpRequest}
 * @param method {String} HTTP verb for the original request
 * @return {Object} Hashmap of the allowed methods
 */
SolidResponse.prototype.parseAllowedMethods =
  function parseAllowedMethods (xhrResponse, method) {
    if (method === 'get') {
      // Not a preflight request
      return {}
    } else {
      return webUtil.parseAllowedMethods(
        xhrResponse.getResponseHeader('Allow'),
        xhrResponse.getResponseHeader('Accept-Patch')
      )
    }
  }

/**
 * Returns the parsed graph of the response (lazy-initializes it if it's not
 * present)
 * @method parsedGraph
 * @return {IndexedFormula}
 */
SolidResponse.prototype.parsedGraph = function parsedGraph () {
  if (!this.graph) {
    this.graph = graphUtil.parseGraph(this.url, this.raw(), this.contentType())
  }
  return this.graph
}

/**
 * Returns the raw XHR response (or null if absent)
 * @method raw
 * @return {Object|Null}
 */
SolidResponse.prototype.raw = function raw () {
  if (this.xhr) {
    return this.xhr.response
  } else {
    return null
  }
}
