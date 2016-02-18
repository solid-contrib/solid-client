require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict'
/**
 * Provides a simple configuration object for Solid web client and other
 * modules.
 * @module config
 */
module.exports = {
  /**
   * Default authentication endpoint
   */
  authEndpoint: 'https://databox.me/',

  /**
   * Default RDF parser library
   */
  parser: 'rdflib',

  /**
   * Default proxy URL for servicing CORS requests
   */
  proxyUrl: 'https://databox.me/,proxy?uri={uri}',

  /**
   * Default signup endpoints (list of identity providers)
   */
  signupEndpoint: 'https://solid.github.io/solid-idps/',

  /**
   * Default height of the Signup popup window, in pixels
   */
  signupWindowHeight: 600,

  /**
   * Default width of the Signup popup window, in pixels
   */
  signupWindowWidth: 1024,

  /**
   * Timeout for web/ajax operations, in milliseconds
   */
  timeout: 50000
}

},{}],2:[function(require,module,exports){
/*
The MIT License (MIT)

Copyright (c) 2015 Solid

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Solid.js is a Javascript library for Solid applications. This library currently
depends on rdflib.js. Please make sure to load the rdflib.js script before
loading solid.js.

If you would like to know more about the solid Solid project, please see
https://github.com/solid/
*/
'use strict'
/**
 * Provides Solid methods for WebID authentication and signup
 * @module auth
 */
module.exports.listen = listen
module.exports.login = login
module.exports.signup = signup

var webClient = require('./web')

/**
 * Sets up an event listener to monitor login messages from child window/iframe
 * @method listen
 * @static
 * @return {Promise<String>} Event listener promise, resolves to user's WebID
 */
function listen () {
  var promise = new Promise(function (resolve, reject) {
    var eventMethod = window.addEventListener
      ? 'addEventListener'
      : 'attachEvent'
    var eventListener = window[eventMethod]
    var messageEvent = eventMethod === 'attachEvent'
      ? 'onmessage'
      : 'message'
    eventListener(messageEvent, function (e) {
      var u = e.data
      if (u.slice(0, 5) === 'User:') {
        var user = u.slice(5, u.length)
        if (user && user.length > 0 && user.slice(0, 4) === 'http') {
          return resolve(user)
        } else {
          return reject(user)
        }
      }
    }, true)
  })

  return promise
}

/**
 * Performs a Solid login() via an XHR HEAD operation.
 * (Attempts to find the current user's WebID from the User header, if
 *   already authenticated.)
 * @method login
 * @static
 * @param [url] {String} Location of a Solid server or container at which the
 *   user might be authenticated.
 *   Defaults to: current page location
 * @param [alternateAuthUrl] {String} URL of an alternate/default auth endpoint.
 *   Defaults to `config.authEndpoint`
 * @return {Promise<String>} XHR HEAD operation promise, resolves to user's WebID
 */
function login (url, alternateAuthUrl) {
  var defaultAuthEndpoint = require('../config').authEndpoint
  url = url || window.location.origin + window.location.pathname
  alternateAuthUrl = alternateAuthUrl || defaultAuthEndpoint
  // First, see if user is already logged in (do a quick HEAD request)
  return webClient.head(url)
    .then(function (solidResponse) {
      if (solidResponse.isLoggedIn()) {
        return solidResponse.user
      } else {
        // If not logged in, try logging in at an alternate endpoint
        return webClient.head(alternateAuthUrl)
          .then(function (solidResponse) {
            // Will return an empty string is this login also fails
            return solidResponse.user
          })
      }
    })
}

/**
 * Opens a signup popup window, sets up `listen()`.
 * @method signup
 * @static
 * @param signupUrl {String} Location of a Solid server for user signup.
 * @return {Promise<String>} Returns a listener promise, resolves with signed
 *   up user's WebID.
 */
function signup (signupUrl) {
  var config = require('../config')
  signupUrl = signupUrl || config.signupEndpoint
  var width = config.signupWindowWidth
  var height = config.signupWindowHeight
  // set borders
  var leftPosition = (window.screen.width / 2) - ((width / 2) + 10)
  // set title and status bars
  var topPosition = (window.screen.height / 2) - ((height / 2) + 50)
  var windowTitle = 'Solid signup'
  var windowUrl = signupUrl + '?origin=' +
    encodeURIComponent(window.location.origin)
  var windowSpecs = 'resizable,scrollbars,status,width=' + width + ',height=' +
    height + ',left=' + leftPosition + ',top=' + topPosition
  window.open(windowUrl, windowTitle, windowSpecs)

  return new Promise(function (resolve, reject) {
    listen().then(function (webid) {
      return resolve(webid)
    }).catch(function (err) {
      return reject(err)
    })
  })
}

},{"../config":1,"./web":13}],3:[function(require,module,exports){
'use strict'
/**
 * Provides convenience methods for graph manipulation.
 * Currently depends on RDFLib
 * @module graph-util
 */
module.exports.appendGraph = appendGraph
module.exports.parseGraph = parseGraph

var rdf = require('./rdf-parser').rdflib

/**
 * Appends RDF statements from one graph object to another
 * @method appendGraph
 * @param toGraph {Graph} rdf.Graph object to append to
 * @param fromGraph {Graph} rdf.Graph object to append from
 * @param docURI {String} Document URI to use as source
 */
function appendGraph (toGraph, fromGraph, docURI) {
  var source = (docURI) ? rdf.sym(docURI) : undefined
  fromGraph.statementsMatching(undefined, undefined, undefined, source)
    .forEach(function (st) {
      toGraph.add(st.subject, st.predicate, st.object, st.why)
    })
}

/**
 * Parses a given graph, from text rdfSource, as a given content type.
 * Returns parsed graph.
 * @method parseGraph
 * @param baseUrl {String}
 * @param rdfSource {String} Text source code
 * @param contentType {String} Mime Type (determines which parser to use)
 * @return {rdf.Graph}
 */
function parseGraph (baseUrl, rdfSource, contentType) {
  var parsedGraph = rdf.graph()
  rdf.parse(rdfSource, parsedGraph, baseUrl, contentType)
  return parsedGraph
}

},{"./rdf-parser":6}],4:[function(require,module,exports){
'use strict'
/**
 * Provides Solid helper functions involved with parsing a user's WebId profile.
 * @module identity
 */
module.exports.getProfile = getProfile
module.exports.loadExtendedProfile = loadExtendedProfile
var graphUtil = require('./graph-util')
var webClient = require('./web')
var SolidProfile = require('./solid-profile')

/**
 * Fetches a user's WebId profile, optionally follows `sameAs` etc links,
 *   and return a promise with a parsed SolidProfile instance.
 * @method getProfile
 * @param profileUrl {String} WebId or Location of a user's profile.
 * @param [ignoreExtended=false] {Boolean} Does not fetch external resources
 *   related to the profile, if true.
 * @param proxyUrl {String} URL template of the proxy to use for CORS
 *                          requests.
 * @param timeout {Number} Request timeout in milliseconds.
 * @return {Promise<SolidProfile>}
 */
function getProfile (profileUrl, ignoreExtended, proxyUrl, timeout) {
  var config = require('../config')
  proxyUrl = proxyUrl || config.proxyUrl
  timeout = timeout || config.timeout
  var options = {
    headers: {
      'Accept': 'text/turtle'
    },
    proxyUrl: proxyUrl,
    timeout: timeout
  }
  // Load main profile
  return webClient.get(profileUrl, options)
    .then(function (response) {
      var contentType = response.contentType()
      if (!contentType) {
        throw new Error('Cannot parse profile without a Content-Type: header')
      }
      return graphUtil.parseGraph(profileUrl, response.raw(), contentType)
    })
    .then(function (parsedProfile) {
      var profile = new SolidProfile(profileUrl, parsedProfile)
      if (ignoreExtended) {
        return profile
      } else {
        return loadExtendedProfile(profile, options)
      }
    })
}

/**
 * Loads the related external profile resources (all the `sameAs` and `seeAlso`
 * links), and appends them to the profile's `parsedGraph`.
 * Returns the profile instance.
 * Usage:
 *
 *   ```
 * var profile = Solid.identity.getProfile(url, true)
 *   .then(function (profile) {
 *     console.log('getProfile results: %o, loading extended..', profile)
 *     return Solid.identity.loadExtendedProfile(profile)
 *   })
 *   ```
 * @method loadExtendedProfile
 * @param profile {SolidProfile}
 * @param [options] Options hashmap (see Solid.web.solidRequest() function docs)
 * @return {Promise<SolidProfile>}
 */
function loadExtendedProfile (profile, options) {
  options = options || {}
  // Politely ask for Turtle formatted profiles
  options.headers = options.headers || {
    'Accept': 'text/turtle'
  }
  var links = profile.relatedProfilesLinks()
  return webClient.loadParsedGraphs(links, options)
    .then(function (loadedGraphs) {
      loadedGraphs.forEach(function (graph) {
        if (graph && graph.value) {
          graphUtil.appendGraph(profile.parsedGraph, graph.value, graph.uri)
        }
      })
      return profile
    })
}

},{"../config":1,"./graph-util":3,"./solid-profile":7,"./web":13}],5:[function(require,module,exports){
'use strict'
/**
 * Provides miscelaneous meta functions (such as library version)
 * @module meta
 */
var lib = require('../package')

/**
 * Returns Solid.js library version (read from `package.json`)
 * @return {String} Lib version
 */
module.exports.version = function version () {
  return lib.version
}

},{"../package":15}],6:[function(require,module,exports){
'use strict'
/**
 * Provides a generic wrapper around an RDF Parser library
 * (currently only RDFLib)
 * @module rdf-parser
 */
var RDFParser = {}
if (typeof window !== 'undefined') {
  // Running inside the browser
  RDFParser.rdflib = window.$rdf
} else {
  // in Node.js
  RDFParser.rdflib = require('rdflib')
}
module.exports = RDFParser

},{"rdflib":undefined}],7:[function(require,module,exports){
'use strict'
/**
 * @module solid-profile
 */
module.exports = SolidProfile
var rdf = require('./rdf-parser').rdflib
var Vocab = require('./vocab')

/**
 * Provides convenience methods for a WebID Profile.
 * Used by `identity.getProfile()`
 * @class SolidProfile
 * @constructor
 */
function SolidProfile (profileUrl, parsedProfile) {
  /**
   * Links to profile-related external resources such as Preferences,
   * Inbox location, storage locations, etc.
   * @property externalResources
   * @type Object
   */
  this.externalResources = {
    inbox: null,
    preferences: [],
    storage: []
  }

  /**
   * Parsed graph of the WebID Profile document
   * @property parsedGraph
   * @type Object
   */
  this.parsedGraph = parsedProfile

  /**
   * Links to "see also" profile documents. Typically loaded immediately
   * after retrieving the initial WebID Profile document.
   * @property relatedProfiles
   * @type Object
   */
  this.relatedProfiles = {
    sameAs: [],
    seeAlso: []
  }

  /**
   * WebId URL (the `foaf:primaryTopic` of the profile document)
   * @property webId
   * @type String
   */
  this.webId = null

  if (!profileUrl) {
    return
  }
  /**
   * Location of the base WebID Profile document (minus the hash fragment).
   * @property baseProfileUrl
   * @type String
   */
  this.baseProfileUrl = (profileUrl.indexOf('#') >= 0)
    ? profileUrl.slice(0, profileUrl.indexOf('#'))
    : profileUrl

  if (parsedProfile) {
    this.initFromGraph(parsedProfile)
  }
}

/**
 * Initializes a profile from a parsed profile RDF graph
 * @method initFromGraph
 * @param parsedProfile {rdf.IndexedFormula} RDFLib-parsed user profile
 */
SolidProfile.prototype.initFromGraph = function initFromGraph (parsedProfile) {
  if (!parsedProfile) {
    return
  }
  try {
    this.webId = extractWebId(this.baseProfileUrl, parsedProfile).uri
  } catch (e) {
    throw new Error('Unable to parse WebID from profile')
  }
  var webId = rdf.sym(this.webId)

  // Init sameAs and seeAlso
  this.relatedProfiles.sameAs = parseLinks(parsedProfile, webId,
    rdf.sym(Vocab.OWL.sameAs))
  this.relatedProfiles.seeAlso = parseLinks(parsedProfile, webId,
    rdf.sym(Vocab.RDFS.seeAlso))

  // Init preferencesFile links
  this.externalResources.preferences = parseLinks(parsedProfile, webId,
    rdf.sym(Vocab.PIM.preferencesFile))

  // Init inbox (singular)
  this.externalResources.inbox = parseLink(parsedProfile, webId,
    rdf.sym(Vocab.SOLID.inbox))

  // Init storage
  this.externalResources.storage = parseLinks(parsedProfile, webId,
    rdf.sym(Vocab.PIM.storage))
}

/**
 * Returns an array of related external profile links (sameAs and seeAlso)
 * @method relatedProfilesLinks
 * @return {Array<String>}
 */
SolidProfile.prototype.relatedProfilesLinks = function relatedProfilesLinks () {
  return this.relatedProfiles.sameAs
    .concat(this.relatedProfiles.seeAlso)
}

/**
 * Convenience method, returns a URIs for a user's Inbox
 * @method inbox
 * @return {String}
 */
SolidProfile.prototype.inbox = function inbox () {
  return this.externalResources.inbox
}

/**
 * Convenience method, returns an array of URIs for a user's preferences docs
 * @method preferences
 * @return {Array<String>}
 */
SolidProfile.prototype.preferences = function preferences () {
  return this.externalResources.preferences
}

/**
 * Convenience method, returns an array of root storage URIs for a user profile
 * @method storage
 * @return {Array<String>}
 */
SolidProfile.prototype.storage = function storage () {
  return this.externalResources.storage
}

/**
 * Extracts the WebID symbol from a parsed profile graph.
 * @method extractWebId
 * @param baseProfileUrl {String} Profile URL, with no hash fragment
 * @param parsedProfile {rdf.IndexedFormula} RDFLib-parsed user profile
 * @return {rdf.Symbol} WebID symbol
 */
function extractWebId (baseProfileUrl, parsedProfile) {
  var subj = rdf.sym(baseProfileUrl)
  var pred = rdf.sym(Vocab.FOAF.primaryTopic)
  var match = parsedProfile.any(subj, pred)
  return match
}

/**
 * Extracts the first URI from a parsed graph that matches parameters
 * @method parseLinks
 * @param graph {rdf.IndexedFormula}
 * @param subject {rdf.Symbol}
 * @param predicate {rdf.Symbol}
 * @param object {rdf.Symbol}
 * @param source {rdf.Symbol}
 * @return {String} URI that matches the parameters
 */
function parseLink (graph, subject, predicate, object, source) {
  var first = graph.any(subject, predicate, object, source)
  if (first) {
    return first.uri
  } else {
    return null
  }
}

/**
 * Extracts the URIs from a parsed graph that match parameters
 * @method parseLinks
 * @param graph {rdf.IndexedFormula}
 * @param subject {rdf.Symbol}
 * @param predicate {rdf.Symbol}
 * @param object {rdf.Symbol}
 * @param source {rdf.Symbol}
 * @return {Array<String>} Array of link URIs that match the parameters
 */
function parseLinks (graph, subject, predicate, object, source) {
  var links = []
  var matches = graph.statementsMatching(subject,
    predicate, object, source)
  matches.forEach(function (match) {
    links.push(match.object.uri)
  })
  return links
}

},{"./rdf-parser":6,"./vocab":10}],8:[function(require,module,exports){
'use strict'
/**
* @module solid-response
*/
module.exports = SolidResponse

var webUtil = require('./web-util')

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
 * Returns true if the user is logged in with the server
 * @method isLoggedIn
 * @return {Boolean}
 */
SolidResponse.prototype.isLoggedIn = function isLoggedIn () {
  return this.user // && this.user.slice(0, 4) === 'http'
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
        xhrResponse.getResponseHeader('Access-Control-Allow-Methods'),
        xhrResponse.getResponseHeader('Accept-Patch')
      )
    }
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

},{"./web-util":12}],9:[function(require,module,exports){
'use strict'
/**
 * Provides Web API helpers dealing with a user's online / offline status.
 * @module status
 */
module.exports.isOnline = isOnline
module.exports.onOffline = onOffline
module.exports.onOnline = onOnline

/**
 * Returns a user's online status (true if user is on line)
 * @method isOnline
 * @static
 * @return {Boolean}
 */
function isOnline () {
  return window.navigator.onLine
}

/**
 * Adds an even listener to trigger when the user goes offline.
 * @method onOffline
 * @static
 * @param callback {Function} Callback to invoke when user goes offline.
 */
function onOffline (callback) {
  window.addEventListener('offline', callback, false)
}

/**
 * Adds an even listener to trigger when the user comes online.
 * @method onOnline
 * @static
 * @param callback {Function} Callback to invoke when user comes online
 */
function onOnline (callback) {
  window.addEventListener('online', callback, false)
}

},{}],10:[function(require,module,exports){
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
    'inbox': 'http://www.w3.org/ns/solid/terms#inbox'
  }
}

module.exports = Vocab

},{}],11:[function(require,module,exports){
'use strict'
/**
 * Provides a wrapper for rdflib's web operations (`rdf.Fetcher` based)
 * @module web-rdflib
 */
var rdf = require('./rdf-parser').rdflib

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

},{"./rdf-parser":6}],12:[function(require,module,exports){
'use strict'
/**
 * Provides misc utility functions for the web client
 * @module web-util
 */
module.exports.composePatchQuery = composePatchQuery
module.exports.parseAllowedMethods = parseAllowedMethods
module.exports.parseLinkHeader = parseLinkHeader

/**
 * Extracts the allowed HTTP methods from the 'Allow' and 'Accept-Patch'
 * headers, and returns a hashmap of verbs allowed by the server
 * @method parseAllowedMethods
 * @param allowMethodsHeader {String} `Access-Control-Allow-Methods` response
 *   header
 * @param acceptPatchHeader {String} `Accept-Patch` response header
 * @return {Object} Hashmap of verbs (in lowercase) allowed by the server for
 *   the current user. Example:
 *   ```
 *   {
 *     'get': true,
 *     'put': true
 *   }
 *   ```
 */
function parseAllowedMethods (allowMethodsHeader, acceptPatchHeader) {
  var allowedMethods = {}
  if (allowMethodsHeader) {
    var verbs = allowMethodsHeader.split(',')
    verbs.forEach(function (methodName) {
      if (methodName && allowMethodsHeader.indexOf(methodName) >= 0) {
        allowedMethods[methodName.trim().toLowerCase()] = true
      }
    })
  }
  if (acceptPatchHeader &&
      acceptPatchHeader.indexOf('application/sparql-update') >= 0) {
    allowedMethods.patch = true
  }
  return allowedMethods
}

/**
* Parses a Link header from an XHR HTTP Request.
* @method parseLinkHeader
* @param link {String} Contents of the Link response header
* @return {Object}
*/
function parseLinkHeader (link) {
  if (!link) {
    return {}
  }
  var linkexp = /<[^>]*>\s*(\s*;\s*[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g
  var paramexp = /[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g
  var matches = link.match(linkexp)
  var rels = {}
  for (var i = 0; i < matches.length; i++) {
    var split = matches[i].split('>')
    var href = split[0].substring(1)
    var ps = split[1]
    var s = ps.match(paramexp)
    for (var j = 0; j < s.length; j++) {
      var p = s[j]
      var paramsplit = p.split('=')
      // var name = paramsplit[0]
      var rel = paramsplit[1].replace(/["']/g, '')
      rels[rel] = href
    }
  }
  return rels
}

/**
 * Composes and returns a PATCH SPARQL query (for use with `web.patch()`)
 * @method composePatchQuery
 * @param toDel {Array<String>} List of triples to delete
 * @param toIns {Array<String>} List of triples to insert
 * @return {String} SPARQL query for use with PATCH
 */
function composePatchQuery (toDel, toIns) {
  var data = ''
  var i
  if (toDel && toDel.length > 0) {
    for (i = 0; i < toDel.length; i++) {
      if (i > 0) {
        data += ' ;\n'
      }
      data += 'DELETE DATA { ' + toDel[i] + ' }'
    }
  }
  if (toIns && toIns.length > 0) {
    for (i = 0; i < toIns.length; i++) {
      if (i > 0 || (toDel && toDel.length > 0)) {
        data += ' ;\n'
      }
      data += 'INSERT DATA { ' + toIns[i] + ' }'
    }
  }
  return data
}

},{}],13:[function(require,module,exports){
'use strict'
/**
 * Provides a Solid web client class for performing LDP CRUD operations.
 * @module web
 */
var config = require('../config')
var graphUtil = require('./graph-util')
var SolidResponse = require('./solid-response')
var Vocab = require('./vocab')
var XMLHttpRequest = require('./xhr')

/**
 * Provides a collection of Solid/LDP web operations (CRUD)
 * @class SolidWebClient
 * @static
 */
var SolidWebClient = {
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
    if (currentIsHttps && targetIsHttp) {
      return true
    } else {
      return false
    }
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
   * @param [options.forceProxy=false] {Boolean} Enforce using proxy URL if true
   * @param [options.headers={}] {Object} HTTP headers to send along
   *          with request
   * @param [options.proxyUrl=config.proxyUrl] {String} Proxy URL to use for
   *          CORS Requests.
   * @param [options.timeout=config.timeout] {Number} Request timeout in
   *          milliseconds.
   * @param [data] {Object} Optional data / payload
   */
  solidRequest: function solidRequest (url, method, options, data) {
    options = options || {}
    options.headers = options.headers || {}
    options.proxyUrl = options.proxyUrl || config.proxyUrl
    options.timeout = options.timeout || config.timeout
    if (this.needsProxy(url) || options.forceProxy) {
      url = this.proxyUrl(url)
    }
    return new Promise(function (resolve, reject) {
      var http = new XMLHttpRequest()
      http.open(method, url)
      http.withCredentials = true
      for (var header in options.headers) {  // Add in optional headers
        http.setRequestHeader(header, options.headers[header])
      }
      if (options.timeout) {
        http.timeout = options.timeout
      }
      http.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          resolve(new SolidResponse(this, method))
        } else {
          reject({
            status: this.status,
            statusText: this.statusText,
            xhr: this
          })
        }
      }
      http.onerror = function () {
        reject({
          status: this.status,
          statusText: this.statusText,
          xhr: this
        })
      }
      if (!data) {
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
   * @return {Promise} Result of an HTTP HEAD operation (returns a meta object)
   */
  head: function head (url) {
    return this.solidRequest(url, 'HEAD')
  },

  /**
   * Retrieves a resource or container by making an HTTP GET call.
   * @method get
   * @param url {String} URL of the resource or container to fetch
   * @param [proxyUrl] {String} URL template of the proxy to use for CORS
   *                          requests.
   * @param [timeout] {Number} Request timeout in milliseconds.
   * @param [options] Options hashmap
   * @param [options.headers] {Object} HTTP headers to send along with request
   * @param [options.proxyUrl=config.proxyUrl] {String} Proxy URL to use for
   *          CORS Requests.
   * @param [options.timeout=config.timeout] {Number} Request timeout in
   *          milliseconds.
   * @return {Promise<SolidResponse>|Object} Result of the HTTP GET operation
   */
  get: function get (url, options) {
    return this.solidRequest(url, 'GET', options)
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
        .catch(function (reason) {
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
   * @return {Promise<Object>|Object}
   */
  getParsedGraph: function getParsedGraph (url, proxyUrl, timeout,
      suppressError) {
    proxyUrl = proxyUrl || config.proxyUrl
    timeout = timeout || config.timeout
    if (config.parser === 'rdflib') {
      var getParsedGraph = require('./web-rdflib').getParsedGraph
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
      resourceType = Vocab.LDP.BasicContainer
      mimeType = 'text/turtle' // Force the right mime type for containers only
    } else {
      resourceType = Vocab.LDP.Resource
      mimeType = mimeType || 'text/turtle'  // default to Turtle
    }
    var options = {}
    options.headers = {}
    options.headers['Link'] = '<' + resourceType + '>; rel="type"'
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
   * @param mime {String} MIME Type of the resource to be created
   * @return {Promise|Object} Result of PUT operation (returns parsed response
   *     meta object if successful, rejects with an anonymous error status
   *     object if not successful)
   */
  put: function put (url, data, mimeType) {
    var options = {}
    options.headers = {}
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
   * @return {Promise|Object} Result of PATCH operation (returns parsed response
   *     meta object if successful, rejects with an anonymous error status
   *     object if not successful)
   */
  patch: function patch (url, toDel, toIns) {
    var composePatchQuery = require('./web-util').composePatchQuery
    var data = composePatchQuery(toDel, toIns)
    var mimeType = 'application/sparql-update'
    var options = {}
    options.headers = {}
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

},{"../config":1,"./graph-util":3,"./solid-response":8,"./vocab":10,"./web-rdflib":11,"./web-util":12,"./xhr":14}],14:[function(require,module,exports){
'use strict'
/**
 * Provides a generic wrapper around the XMLHttpRequest object, to make it
 * usable both in the browser and in Node.js
 * @module xhr
 */
var XMLHttpRequest
if (typeof window !== 'undefined' && 'XMLHttpRequest' in window) {
  // Running inside the browser
  XMLHttpRequest = window.XMLHttpRequest
} else {
  // in Node.js
  XMLHttpRequest = require('xhr2')
}
module.exports = XMLHttpRequest

},{"xhr2":undefined}],15:[function(require,module,exports){
module.exports={
  "name": "solid",
  "version": "0.7.0",
  "description": "Common library for writing Solid applications",
  "main": "./index.js",
  "scripts": {
    "build-browserified": "browserify -r ./index.js:solid --exclude 'xhr2' --exclude 'rdflib' > dist/solid.js",
    "build-minified": "browserify -r ./index.js:solid --exclude 'xhr2' --exclude 'rdflib' -d -p [minifyify --no-map] > dist/solid.min.js",
    "build": "npm run clean && npm run standard && npm run build-browserified && npm run build-minified",
    "clean": "rm -rf dist/*",
    "standard": "standard lib/*",
    "tape": "tape test/unit/*.js",
    "test": "npm run standard && npm run tape",
    "qunit": "npm run standard && npm run build-browserified && open test/index.html"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/solid/solid.js"
  },
  "keywords": [
    "solid",
    "decentralized",
    "web",
    "rdf",
    "ldp",
    "linked",
    "data"
  ],
  "author": "Andrei Sambra <andrei@fcns.eu>",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/solid/solid.js/issues"
  },
  "homepage": "https://github.com/solid/solid.js",
  "dependencies": {
    "rdflib": "^0.3.2",
    "xhr2": "^0.1.3"
  },
  "devDependencies": {
    "browserify": "^13.0.0",
    "minifyify": "^7.2.1",
    "standard": "^5.4.1",
    "tape": "^4.4.0"
  },
  "standard": {
    "globals": [
      "$rdf",
      "tabulator",
      "QUnit"
    ]
  }
}

},{}],"solid":[function(require,module,exports){
/*
The MIT License (MIT)

Copyright (c) 2015-2016 Solid

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Solid.js is a Javascript library for Solid applications. This library currently
depends on rdflib.js. Please make sure to load the rdflib.js script before
loading solid.js.

If you would like to know more about the solid Solid project, please see
https://github.com/solid/solid
*/
'use strict'
/**
 * Provides a Solid client helper object (which exposes various static modules).
 * @module solid.js
 * @main solid.js
 */

/**
 * @class Solid
 * @static
 */
var Solid = {
  auth: require('./lib/auth'),
  config: require('./config'),
  identity: require('./lib/identity'),
  meta: require('./lib/meta'),
  status: require('./lib/status'),
  web: require('./lib/web'),
  webUtil: require('./lib/web-util')
}

module.exports = Solid

},{"./config":1,"./lib/auth":2,"./lib/identity":4,"./lib/meta":5,"./lib/status":9,"./lib/web":13,"./lib/web-util":12}]},{},[]);
