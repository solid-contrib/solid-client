require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
var XMLHttpRequest = require('xhr2')

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

},{"xhr2":6}],2:[function(require,module,exports){
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
    solidClient.get(url).then(
      function (graph) {
        // set WebID
        url = (url.indexOf('#') >= 0) ? url.slice(0, url.indexOf('#')) : url
        var webid = graph.any($rdf.sym(url), FOAF('primaryTopic'))
        // find additional resources to load
        var toLoad = []
        toLoad = toLoad.concat(graph.statementsMatching(webid,
          OWL('sameAs'), undefined, $rdf.sym(url)))
        toLoad = toLoad.concat(graph.statementsMatching(webid,
          RDFS('seeAlso'), undefined, $rdf.sym(url)))
        toLoad = toLoad.concat(graph.statementsMatching(webid,
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
          solidClient.get(prof.object.uri).then(
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

},{"./web":5}],3:[function(require,module,exports){
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

},{"../package":7}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
'use strict'
/**
 * Provides a Solid web client class for performing LDP CRUD operations.
 * @module web
 */

var XMLHttpRequest = require('xhr2')
// Init some defaults
var PROXY = 'https://databox.me/,proxy?uri={uri}'
var TIMEOUT = 5000

$rdf.Fetcher.crossSiteProxyTemplate = PROXY
// common vocabs
var LDP = $rdf.Namespace('http://www.w3.org/ns/ldp#')

/**
 * Parses a Link header from an XHR HTTP Request.
 * @method parseLinkHeader
 * @param link {String} Contents of the Link response header
 * @return {Object}
 */
var parseLinkHeader = function parseLinkHeader (link) {
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
 * Parses an XHR response and composes a meta object
 * @method parseResponseMeta
 * @param resp {XMLHttpRequest} Result of an XHR
 * @return {Object} Parsed response object
 */
function parseResponseMeta (resp) {
  var h = parseLinkHeader(resp.getResponseHeader('Link'))
  var meta = {}
  meta.url = (resp.getResponseHeader('Location'))
    ? resp.getResponseHeader('Location')
    : resp.responseURL
  meta.acl = h['acl']
  meta.meta = (h['meta']) ? h['meta'] : h['describedBy']
  meta.user = (resp.getResponseHeader('User'))
    ? resp.getResponseHeader('User')
    : ''
  meta.websocket = (resp.getResponseHeader('Updates-Via'))
    ? resp.getResponseHeader('Updates-Via')
    : ''
  // writable/editable resource
  meta.editable = []
  var patch = resp.getResponseHeader('Accept-Patch')
  if (patch && patch.indexOf('application/sparql-update') >= 0) {
    meta.editable.push('patch')
  }
  var allow = resp.getResponseHeader('Allow')
  if (allow) {
    if (allow.indexOf('PUT') >= 0) {
      meta.editable.push('put')
    }
    if (allow.indexOf('POST') >= 0) {
      meta.editable.push('post')
    }
    if (allow.indexOf('DELETE') >= 0) {
      meta.editable.push('delete')
    }
  }

  meta.exists = (resp.status === 200)
  meta.xhr = resp
  return meta
}

/**
 * Providers a collection of Solid/LDP web operations (CRUD)
 * @class SolidWebClient
 * @static
 */
var SolidWebClient = {
  /**
   * Checks to see if a Solid resource exists, and returns useful resource
   *   metadata info.
   * @method head
   * @param url {String} URL of a resource or container
   * @return {Promise} Result of an HTTP HEAD operation (returns a meta object)
   */
  head: function head (url) {
    var promise = new Promise(function (resolve) {
      var http = new XMLHttpRequest()
      http.open('HEAD', url)
      http.withCredentials = true
      http.onreadystatechange = function () {
        if (this.readyState === this.DONE) {
          resolve(parseResponseMeta(this))
        }
      }
      http.send()
    })

    return promise
  },

  /**
   * Retrieves a resource or container by making an HTTP GET call.
   * @method get
   * @param url {String} URL of the resource or container to fetch
   * @return {Promise|Object} Result of the HTTP GET operation
   */
  get: function get (url) {
    var promise = new Promise(function (resolve, reject) {
      var g = $rdf.graph()
      var f = new $rdf.Fetcher(g, TIMEOUT)

      var docURI = (url.indexOf('#') >= 0)
        ? url.slice(0, url.indexOf('#'))
        : url
      f.nowOrWhenFetched(docURI, undefined, function (ok, body, xhr) {
        if (!ok) {
          reject({status: xhr.status, xhr: xhr})
        } else {
          resolve(g)
        }
      })
    })

    return promise
  },

  /**
   * Creates a new resource by performing
   *   a Solid/LDP POST operation to a specified container.
   * @param url {String} URL of the container to post to
   * @param data {Object} Data/payload of the resource to be created
   * @param slug {String} Suggested URL fragment for the new resource
   * @param isContainer {Boolean} Is the object being created a Container
   *            or Resource?
   * @param mime {String} MIME Type
   * @method post
   * @return {Promise|Object} Result of XHR POST (returns parsed
   *     response meta object) or an anonymous error object with status code
   */
  post: function post (url, data, slug, isContainer, mime) {
    var resType = LDP('Resource').uri
    if (isContainer) {
      resType = LDP('BasicContainer').uri
      mime = 'text/turtle' // force right mime for containers only
    }
    mime = mime || 'text/turtle'
    var promise = new Promise(function (resolve, reject) {
      var http = new XMLHttpRequest()
      http.open('POST', url)
      http.setRequestHeader('Content-Type', mime)
      http.setRequestHeader('Link', '<' + resType + '>; rel="type"')
      if (slug && slug.length > 0) {
        http.setRequestHeader('Slug', slug)
      }
      http.withCredentials = true
      http.onreadystatechange = function () {
        if (this.readyState === this.DONE) {
          if (this.status === 200 || this.status === 201) {
            return resolve(parseResponseMeta(this))
          } else {
            reject({status: this.status, xhr: this})
          }
        }
      }
      if (data && data.length > 0) {
        http.send(data)
      } else {
        http.send()
      }
    })

    return promise
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
  put: function put (url, data, mime) {
    var promise = new Promise(function (resolve, reject) {
      mime = mime || 'text/turtle'
      var http = new XMLHttpRequest()
      http.open('PUT', url)
      http.setRequestHeader('Content-Type', mime)
      http.withCredentials = true
      http.onreadystatechange = function () {
        if (this.readyState === this.DONE) {
          if (this.status === 200 || this.status === 201) {
            return resolve(parseResponseMeta(this))
          } else {
            reject({status: this.status, xhr: this})
          }
        }
      }
      // Handle network errors
      http.onerror = function () {
        reject(Error('Network Error'))
      }
      if (data) {
        http.send(data)
      } else {
        http.send()
      }
    })

    return promise
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
    var promise = new Promise(function (resolve, reject) {
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

      var http = new XMLHttpRequest()
      http.open('PATCH', url)
      http.setRequestHeader('Content-Type', 'application/sparql-update')
      http.withCredentials = true
      http.onreadystatechange = function () {
        if (this.readyState === this.DONE) {
          if (this.status === 200 || this.status === 201) {
            return resolve(parseResponseMeta(this))
          } else {
            reject({status: this.status, xhr: this})
          }
        }
      }
      if (data && data.length > 0) {
        http.send(data)
      } else {
        http.send()
      }
    })

    return promise
  },

  /**
   * Deletes an existing resource or container.
   * @method del
   * @param url {String} URL of the resource or container to be deleted
   * @return {Promise|Object} Result of the HTTP Delete operation (returns true
   *   on success, or an anonymous error object on failure)
   */
  del: function del (url) {
    var promise = new Promise(function (resolve, reject) {
      var http = new XMLHttpRequest()
      http.open('DELETE', url)
      http.withCredentials = true
      http.onreadystatechange = function () {
        if (this.readyState === this.DONE) {
          if (this.status === 200 || this.status === 201) {
            return resolve(true)
          } else {
            reject({status: this.status, xhr: this})
          }
        }
      }
      http.send()
    })

    return promise
  }
}

// Alias some extra Solid web client methods
SolidWebClient.create = SolidWebClient.post
SolidWebClient.replace = SolidWebClient.put
SolidWebClient.update = SolidWebClient.patch
SolidWebClient.parseLinkHeader = parseLinkHeader

module.exports = SolidWebClient

},{"xhr2":6}],6:[function(require,module,exports){
module.exports = XMLHttpRequest;

},{}],7:[function(require,module,exports){
module.exports={
  "name": "solid.js",
  "version": "0.5.1",
  "description": "Common library for writing Solid applications",
  "main": "dist/solid.js",
  "scripts": {
    "build-browserified": "browserify -r ./index.js:solid.js > dist/solid.js",
    "build-minified": "browserify -r ./index.js:solid.js -d -p [minifyify --map dist/solid.js.map.json --output dist/solid.js.map.json] > dist/solid.min.js",
    "build": "npm run build-browserified && npm run build-minified",
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

},{}],"solid.js":[function(require,module,exports){
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
  identity: require('./lib/identity'),
  meta: require('./lib/meta'),
  status: require('./lib/status'),
  web: require('./lib/web')
}

if (typeof tabulator !== 'undefined') {
  tabulator.solid = Solid
}

module.exports = Solid

},{"./lib/auth":1,"./lib/identity":2,"./lib/meta":3,"./lib/status":4,"./lib/web":5}]},{},[]);
