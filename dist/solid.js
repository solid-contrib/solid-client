require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

/**
 * Provides Solid methods for WebID authentication and signup
 * @module auth
 */
'use strict'
var XMLHttpRequest = require('./xhr.js')

// default (preferred) authentication endpoint
var authEndpoint = 'https://databox.me/'
var signupEndpoint = 'https://solid.github.io/solid-idps/'

/**
 * Sets up an event listener to monitor login messages from child window/iframe
 * @method listen
 * @static
 * @return {Promise<String>} Event listener promise, resolves to user's WebID
 */
var listen = function listen () {
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
 * @param url {String} Location of a Solid server or container at which the
 *   user might be authenticated.
 * @return {Promise<String>} XHR HEAD op promise, resolves to user's WebID
 */
var login = function login (url) {
  url = url || window.location.origin + window.location.pathname
  var promise = new Promise(function (resolve, reject) {
    var http = new XMLHttpRequest()
    http.open('HEAD', url)
    http.withCredentials = true
    http.onreadystatechange = function () {
      if (this.readyState === this.DONE) {
        if (this.status === 200) {
          var user = this.getResponseHeader('User')
          if (user && user.length > 0 && user.slice(0, 4) === 'http') {
            return resolve(user)
          }
        }
        // authenticate to a known endpoint
        var http = new XMLHttpRequest()
        http.open('HEAD', authEndpoint)
        http.withCredentials = true
        http.onreadystatechange = function () {
          if (this.readyState === this.DONE) {
            if (this.status === 200) {
              var user = this.getResponseHeader('User')
              if (user && user.length > 0 && user.slice(0, 4) === 'http') {
                return resolve(user)
              }
            }
            return reject({status: this.status, xhr: this})
          }
        }
        http.send()
      }
    }
    http.send()
  })

  return promise
}

/**
 * Opens a signup popup window, sets up `listen()`.
 * @method signup
 * @static
 * @param url {String} Location of a Solid server for user signup.
 * @return {Promise<String>} Returns a listener promise, resolves with signed
 *   up user's WebID.
 */
var signup = function signup (url) {
  url = url || signupEndpoint
  var leftPosition, topPosition
  var width = 1024
  var height = 600
  // set borders
  leftPosition = (window.screen.width / 2) - ((width / 2) + 10)
  // set title and status bars
  topPosition = (window.screen.height / 2) - ((height / 2) + 50)
  window.open(url + '?origin=' + encodeURIComponent(window.location.origin),
   'Solid signup', 'resizable,scrollbars,status,width=' + width + ',height=' +
   height + ',left=' + leftPosition + ',top=' + topPosition)

  var promise = new Promise(function (resolve, reject) {
    listen().then(function (webid) {
      return resolve(webid)
    }).catch(function (err) {
      return reject(err)
    })
  })

  return promise
}

module.exports.listen = listen
module.exports.login = login
module.exports.signup = signup

},{"./xhr.js":11}],3:[function(require,module,exports){
'use strict'
/**
 * Provides Solid helper functions involved with parsing a user's WebId profile.
 * @module identity
 */

var solidClient = require('./web')

// common vocabs
// var RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#')
var RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#")
var OWL = $rdf.Namespace('http://www.w3.org/2002/07/owl#')
var PIM = $rdf.Namespace('http://www.w3.org/ns/pim/space#')
var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/')
var DCT = $rdf.Namespace('http://purl.org/dc/terms/')

/**
 * Appends RDF statements from one graph object to another
 * @method appendGraph
 * @param toGraph {Graph} $rdf.Graph object to append to
 * @param fromGraph {Graph} $rdf.Graph object to append from
 * @param docURI {String} Document URI to use as source
 */
var appendGraph = function appendGraph (toGraph, fromGraph, docURI) {
  var source = (docURI) ? $rdf.sym(docURI) : undefined
  fromGraph.statementsMatching(undefined, undefined, undefined, source)
    .forEach(function (st) {
      toGraph.add(st.subject, st.predicate, st.object, st.why)
    })
}

/**
 * Fetches a user's WebId profile, follows `sameAs` links,
 *   and return a promise with a parsed RDF graph of the results.
 * @method getProfile
 * @static
 * @param url {String} WebId or Location of a user's profile.
 * @return {Promise<Graph>}
 */
var getProfile = function getProfile (url) {
  var promise = new Promise(function (resolve, reject) {
    // Load main profile
    solidClient.getParsedGraph(url).then(
      function (graph) {
        // set WebID
        url = (url.indexOf('#') >= 0) ? url.slice(0, url.indexOf('#')) : url
        var webid = graph.any($rdf.sym(url), FOAF('primaryTopic'))
        // find additional resources to load
        var toLoad = []
        toLoad = toLoad
          .concat(graph.statementsMatching(webid,
            OWL('sameAs'), undefined, $rdf.sym(url)))
          .concat(graph.statementsMatching(webid,
            RDFS('seeAlso'), undefined, $rdf.sym(url)))
          .concat(graph.statementsMatching(webid,
            PIM('preferencesFile'), undefined, $rdf.sym(url)))
        var total = toLoad.length
        // sync promises externally instead of using Promise.all()
        // which fails if one GET fails
        var syncAll = function () {
          if (total === 0) {
            return resolve(graph)
          }
        }
        if (total === 0) {
          return resolve(graph)
        }
        // Load other files
        toLoad.forEach(function (prof) {
          solidClient.getParsedGraph(prof.object.uri).then(
            function (g) {
              appendGraph(graph, g, prof.object.uri)
              total--
              syncAll()
            }
          ).catch(
            function (err) {
              if (err) throw err
              total--
              syncAll()
            })
        })
      }
    )
    .catch(
      function (err) {
        reject(err)
      }
    )
  })

  return promise
}

/**
 * Finds the Workspaces linked from the user's WebId Profile.
 * (Optionally fetches the profile, if it hasn't already been loaded.)
 * @method getWorkspaces
 * @static
 * @param webid {String} WebId or Location of a user's profile.
 * @param graph {Graph} Parsed graph of the user's profile.
 * @return {Array<Object>} List of parsed Workspace triples.
 */
var getWorkspaces = function getWorkspaces (webid, graph) {
  var promise = new Promise(function (resolve, reject) {
    if (!graph) {
      // fetch profile and call function again
      getProfile(webid).then(function (g) {
        getWorkspaces(webid, g).then(function (ws) {
          return resolve(ws)
        }).catch(function (err) {
          return reject(err)
        })
      }).catch(function (err) {
        return reject(err)
      })
    } else {
      // find workspaces
      var workspaces = []
      var ws = graph.statementsMatching($rdf.sym(webid), PIM('workspace'),
        undefined)
      if (ws.length === 0) {
        return resolve(workspaces)
      }
      ws.forEach(function (w) {
        // try to get some additional info - i.e. desc/title
        var workspace = {}
        var title = graph.any(w.object, DCT('title'))
        if (title && title.value) {
          workspace.title = title.value
        }
        workspace.url = w.object.uri
        workspace.statements = graph.statementsMatching(w.object, undefined,
          undefined)
        workspaces.push(workspace)
      })
      return resolve(workspaces)
    }
  })

  return promise
}

/**
 * Finds writeable profiles linked from the user's WebId Profile.
 * @method getWritableProfiles
 * @static
 * @param webid {String} WebId or Location of a user's profile.
 * @param graph {Graph} Parsed graph of the user's profile.
 * @return {Array<Object>} List of writeable profile triples
 */
var getWritableProfiles = function getWritableProfiles (webid, graph) {
  var promise = new Promise(function (resolve, reject) {
    if (!graph) {
      // fetch profile and call function again
      getProfile(webid).then(function (g) {
        getWritableProfiles(webid, g).then(function (list) {
          return resolve(list)
        }).catch(function (err) {
          return reject(err)
        })
      }).catch(function (err) {
        return reject(err)
      })
    } else {
      // find profiles
      var profiles = []

      webid = (webid.indexOf('#') >= 0)
        ? webid.slice(0, webid.indexOf('#'))
        : webid
      var user = graph.any($rdf.sym(webid), FOAF('primaryTopic'))
      // find additional resources to load
      var toLoad = []
      toLoad = toLoad.concat(graph.statementsMatching(user,
        OWL('sameAs'), undefined, $rdf.sym(webid)))
      toLoad = toLoad.concat(graph.statementsMatching(user,
        RDFS('seeAlso'), undefined, $rdf.sym(webid)))
      toLoad = toLoad.concat(graph.statementsMatching(user,
        PIM('preferencesFile'), undefined, $rdf.sym(webid)))
      // also check this (main) profile doc
      toLoad = toLoad.concat({object: {uri: webid}})
      var total = toLoad.length
      // sync promises externally instead of using Promise.all()
      // which fails if one GET fails
      var syncAll = function () {
        if (total === 0) {
          return resolve(profiles)
        }
      }
      if (total === 0) {
        return resolve(profiles)
      }

      // Load sameAs files
      toLoad.forEach(function (prof) {
        var url = prof.object.uri
        solidClient.head(url).then(
          function (meta) {
            if (meta.editable.length > 0 && profiles.indexOf(url) < 0) {
              profiles.push({url: url, editable: meta.editable})
            }
            total--
            syncAll()
          }
        ).catch(
          function (err) {
            if (err) throw err
            total--
            syncAll()
          })
      })
    }
  })

  return promise
}

module.exports.getProfile = getProfile
module.exports.getWorkspaces = getWorkspaces
module.exports.getWritableProfiles = getWritableProfiles

},{"./web":10}],4:[function(require,module,exports){
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

},{"../package":12}],5:[function(require,module,exports){
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
  if(!xhrResponse) {
    this.xhr = null
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
  return this.xhr.status >= 200 && this.xhr.status < 400
}

module.exports = SolidResponse

},{"./web-util":9}],6:[function(require,module,exports){
'use strict'
/**
 * Provides Web API helpers dealing with a user's online / offline status.
 * @module status
 */

/**
 * Returns a user's online status (true if user is on line)
 * @method isOnline
 * @static
 * @return {Boolean}
 */
var isOnline = function isOnline () {
  return window.navigator.onLine
}

/**
 * Adds an even listener to trigger when the user goes offline.
 * @method onOffline
 * @static
 * @param callback {Function} Callback to invoke when user goes offline.
 */
var onOffline = function onOffline (callback) {
  window.addEventListener('offline', callback, false)
}

/**
 * Adds an even listener to trigger when the user comes online.
 * @method onOnline
 * @static
 * @param callback {Function} Callback to invoke when user comes online
 */
var onOnline = function onOnline (callback) {
  window.addEventListener('online', callback, false)
}

module.exports.isOnline = isOnline
module.exports.onOffline = onOffline
module.exports.onOnline = onOnline

},{}],7:[function(require,module,exports){
'use strict'
/**
 * Provides a hashmap of relevant vocabs / namespaces
 * @module vocab
 */
var Vocab = {
  'LDP': {
    'BasicContainer': 'http://www.w3.org/ns/ldp#BasicContainer',
    'NonRDFSource': 'http://www.w3.org/ns/ldp#NonRDFSource',
    'RDFSource': 'http://www.w3.org/ns/ldp#RDFSource',
    'Resource': 'http://www.w3.org/ns/ldp#Resource'
  }
}

module.exports = Vocab

},{}],8:[function(require,module,exports){
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

},{"rdflib":undefined}],9:[function(require,module,exports){
'use strict'
/**
 * Provides misc utility functions for the web client
 * @module web-util
 */

/**
 * Extracts the allowed HTTP methods from the 'Allow' and 'Accept-Patch'
 * headers, and returns a hashmap of verbs allowed by the server
 * @method parseAllowedMethods
 * @param allowHeader {String} `Allow:` response header
 * @param acceptPatchHeader {String} `Accept-Patch` response header
 * @return {Object} Hashmap of verbs allowed by the server. Example:
 *   ```
 *   {
 *     'GET': true,
 *     'PUT': true
 *   }
 *   ```
 */
function parseAllowedMethods (allowHeader, acceptPatchHeader) {
  var allowedMethods = {}
  if (allowHeader) {
    var verbs = ['HEAD', 'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    verbs.forEach(function (methodName) {
      if (allowHeader.indexOf(methodName) >= 0) {
        allowedMethods[methodName] = true
      }
    })
  }
  if (acceptPatchHeader &&
      acceptPatchHeader.indexOf('application/sparql-update') >= 0) {
    this.allowedMethods.patch = true
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

module.exports.composePatchQuery = composePatchQuery
module.exports.parseAllowedMethods = parseAllowedMethods
module.exports.parseLinkHeader = parseLinkHeader

},{}],10:[function(require,module,exports){
'use strict'
/**
 * Provides a Solid web client class for performing LDP CRUD operations.
 * @module web
 */
var config = require('../config')
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
   * Sends a generic XHR request with the appropriate Solid headers,
   * and returns a promise that resolves to a parsed response.
   * @method solidRequest
   * @param url {String} URL of the request
   * @param method {String} HTTP Verb ('GET', 'PUT', etc)
   * @param [options] Options hashmap
   * @param [options.headers] {Object} HTTP headers to send along with request
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
    return new Promise(function (resolve, reject) {
      var http = new XMLHttpRequest()
      http.open(method, url)
      http.withCredentials = true
      for (var header in options.headers) {  // Add in optional headers
        http.setRequestHeader(header, options.headers[header])
      }
      if(!!options.timeout) {
        http.timeout = options.timeout
      }
      http.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          resolve(new SolidResponse(this))
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
   *                          requests. Defaults to `config.proxyUrl`.
   * @param [timeout] {Number} Request timeout in milliseconds.
   *                         Defaults to `config.timeout`.
   * @return {Promise|Object} Result of the HTTP GET operation
   */
  get: function get (url, proxyUrl, timeout) {
    var options = {
      proxyUrl: proxyUrl,
      timeout: timeout
    }
    return this.solidRequest(url, 'GET', options)
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
  getParsedGraph: function getParsedGraph (url, proxyUrl, timeout) {
    proxyUrl = proxyUrl || config.proxyUrl
    timeout = timeout || config.timeout
    if(config.parser === 'rdflib') {
      var getParsedGraph = require('./web-rdflib').getParsedGraph
    } else {
      throw Error("Parser library not supported: " + config.parser)
    }
    return getParsedGraph(url, proxyUrl, timeout)
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

},{"../config":1,"./solid-response":5,"./vocab":7,"./web-rdflib":8,"./web-util":9,"./xhr":11}],11:[function(require,module,exports){
'use strict'
/**
 * Provides a generic wrapper around the XMLHttpRequest object, to make it
 * usable both in the browser and in Node.js
 * @module xhr
 */
var XMLHttpRequest
if (window !== undefined && 'XMLHttpRequest' in window) {
  // Running inside the browser
  XMLHttpRequest = window.XMLHttpRequest
} else {
  // in Node.js
  XMLHttpRequest = require('xhr2')
}

module.exports = XMLHttpRequest

},{"xhr2":undefined}],12:[function(require,module,exports){
module.exports={
  "name": "solid",
  "version": "0.5.1",
  "description": "Common library for writing Solid applications",
  "main": "dist/solid.js",
  "scripts": {
    "build-browserified": "browserify -r ./index.js:solid --exclude 'xhr2' --exclude 'rdflib' > dist/solid.js",
    "build-minified": "browserify -r ./index.js:solid --exclude 'xhr2' --exclude 'rdflib' -d -p [minifyify --no-map] > dist/solid.min.js",
    "build": "npm run clean && npm run build-browserified && npm run build-minified",
    "clean": "rm -rf dist/*",
    "standard": "standard lib/*",
    "tape": "tape test/**/*.js",
    "test": "npm run standard && npm run build-browserified && open test/index.html"
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
    "standard": "^5.4.1"
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
  web: require('./lib/web')
}

if (typeof tabulator !== 'undefined') {
  tabulator.solid = Solid
}

module.exports = Solid

},{"./config":1,"./lib/auth":2,"./lib/identity":3,"./lib/meta":4,"./lib/status":6,"./lib/web":10}]},{},[]);
