'use strict'
/**
* @module solid-response
*/

var parseLinkHeader = require('./web-util').parseLinkHeader
var parseAllowedMethods = require('./web-util').parseAllowedMethods

/**
* Provides a wrapper around an XHR response object, and adds several
* Solid-specific parsed fields (link headers, allowed verbs, etc)
* @class SolidResponse
* @constructor
*/
function SolidResponse (xhrResponse) {
  if (!xhrResponse) {
    this.xhr = null
    this.user = ''
    return
  }
  /**
   * Hashmap of parsed `Link:` headers. Example:
   *
   *   ```
   *   {
   *     acl: 'resourceName.acl',
   *     describedBy: 'resourceName.meta',
   *     type: 'http://www.w3.org/ns/ldp#Resource'
   *   }
   *   ```
   * @property linkHeaders
   * @type Object
   */
  this.linkHeaders = parseLinkHeader(xhrResponse.getResponseHeader('Link')) || {}
  /**
   * Name of the corresponding `.acl` resource
   * @property acl
   * @type String
   */
  this.acl = this.linkHeaders['acl']
  /**
   * Hashmap of HTTP methods/verbs allowed by the server.
   * (If a verb is not allowed, it's not included.)
   * Example:
   *   ```
   *   {
   *     'GET': true,
   *     'PUT': true
   *   }
   *   ```
   * @property allowedMethods
   * @type Object
   */
  this.allowedMethods =
    parseAllowedMethods(xhrResponse.getResponseHeader('Allow'),
      xhrResponse.getResponseHeader('Accept-Patch'))
  /**
   * Name of the corresponding `.meta` resource
   * @property meta
   * @type String
   */
  this.meta = this.linkHeaders['meta'] || this.linkHeaders['describedBy']
  /**
   * LDP Type for the resource.
   * Example: 'http://www.w3.org/ns/ldp#Resource'
   */
  this.type = this.linkHeaders.type
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
   * Example: `wss://example.org/blog/hellow-world`
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
 * Returns true if the resource exists (not a 404)
 * @method exists
 * @return {Boolean}
 */
SolidResponse.prototype.exists = function exists () {
  return this.xhr && this.xhr.status >= 200 && this.xhr.status < 400
}

SolidResponse.prototype.isLoggedIn = function isLoggedIn () {
  return this.user // && this.user.slice(0, 4) === 'http'
}

module.exports = SolidResponse
