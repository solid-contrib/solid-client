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

// WebID authentication and signup
'use strict'
var XMLHttpRequest = require('xhr2')

// default (preferred) authentication endpoint
var authEndpoint = 'https://databox.me/'
var signupEndpoint = 'https://solid.github.io/solid-idps/'

// Listen to login messages from child window/iframe
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

// attempt to find the current user's WebID from the User header
// if authenticated
// resolve(webid) - string
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

// Open signup window
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

},{"xhr2":7}],2:[function(require,module,exports){
'use strict'
// Identity / WebID
var solidClient = require('./web')
var appendGraph = require('./utils').appendGraph

// common vocabs
// var RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#')
var OWL = $rdf.Namespace('http://www.w3.org/2002/07/owl#')
var PIM = $rdf.Namespace('http://www.w3.org/ns/pim/space#')
var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/')
var DCT = $rdf.Namespace('http://purl.org/dc/terms/')

// fetch user profile (follow sameAs links) and return promise with a graph
// resolve(graph)
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
          OWL('seeAlso'), undefined, $rdf.sym(url)))
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

// Find the user's workspaces
// Return an object with the list of objects (workspaces)
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

// Find the user's writable profiles
// Return an object with the list of profile URIs
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
        OWL('seeAlso'), undefined, $rdf.sym(webid)))
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

},{"./utils":5,"./web":6}],3:[function(require,module,exports){
'use strict'
var lib = require('../package')

module.exports.version = function version () {
  return lib.version
}

},{"../package":8}],4:[function(require,module,exports){
'use strict'

// Get current online status
var isOnline = function isOnline () {
  return window.navigator.onLine
}

// Is offline
var onOffline = function onOffline (callback) {
  window.addEventListener('offline', callback, false)
}

// Trigger when user comes online
var onOnline = function onOnline (callback) {
  window.addEventListener('online', callback, false)
}

// Events
module.exports.isOnline = isOnline
module.exports.onOffline = onOffline
module.exports.onOnline = onOnline

},{}],5:[function(require,module,exports){
'use strict'
// Helper functions
// append statements from one graph object to another
var appendGraph = function appendGraph (toGraph, fromGraph, docURI) {
  var source = (docURI) ? $rdf.sym(docURI) : undefined
  fromGraph.statementsMatching(undefined, undefined, undefined, source)
    .forEach(function (st) {
      toGraph.add(st.subject, st.predicate, st.object, st.why)
    })
}

// parse a Link header
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

module.exports.appendGraph = appendGraph
module.exports.parseLinkHeader = parseLinkHeader

},{}],6:[function(require,module,exports){
'use strict'
var XMLHttpRequest = require('xhr2')
var parseLinkHeader = require('./utils').parseLinkHeader

// Init some defaults
var PROXY = 'https://databox.me/,proxy?uri={uri}'
var TIMEOUT = 5000

$rdf.Fetcher.crossSiteProxyTemplate = PROXY
// common vocabs
var LDP = $rdf.Namespace('http://www.w3.org/ns/ldp#')

// return metadata for a given request
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

// LDP operations
var client = {
  // check if a resource exists and return useful Solid info
  // (acl, meta, type, etc)
  // resolve(metaObj)
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

  // fetch an RDF resource
  // resolve(graph) | reject(this)
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

  // create new resource
  // resolve(metaObj) | reject
  post: function post (url, data, slug, isContainer, mime) {
    var resType = LDP('Resource').uri
    if (isContainer) {
      resType = LDP('BasicContainer').uri
      mime = 'text/turtle' // force right mime for containers only
    }
    mime = (mime) ? mime : 'text/turtle'
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
            resolve(parseResponseMeta(this))
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

  // update/create resource using HTTP PUT
  // resolve(metaObj) | reject
  put: function put (url, data, mime) {
    var promise = new Promise(function (resolve, reject) {
      mime = (mime) ? mime : 'text/turtle'
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
      if (data) {
        http.send(data)
      } else {
        http.send()
      }
    })

    return promise
  },

  // patch a resource
  // accepts arrays of individual statements (turtle) as params
  // e.g. [ '<a> <b> <c> .', '<d> <e> <f> .']
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
          if (this.status === 200) {
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

  // delete a resource
  // resolve(true) | reject
  del: function del (url) {
    var promise = new Promise(function (resolve, reject) {
      var http = new XMLHttpRequest()
      http.open('DELETE', url)
      http.withCredentials = true
      http.onreadystatechange = function () {
        if (this.readyState === this.DONE) {
          if (this.status === 200) {
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

// Alias some methods
client.create = client.post
client.replace = client.put
client.update = client.patch

module.exports = client

},{"./utils":5,"xhr2":7}],7:[function(require,module,exports){
module.exports = XMLHttpRequest;

},{}],8:[function(require,module,exports){
module.exports={
  "name": "solid.js",
  "version": "0.5.0",
  "description": "Common library for writing Solid applications",
  "main": "dist/solid.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "build": "browserify -r ./index.js:solid.js > dist/solid.js"
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
    "rdflib": "^0.2.10",
    "xhr2": "*"
  },
  "devDependencies": {
    "browserify": "*",
    "standard": "^5.4.1"
  },
  "standard": {
    "globals": [ "$rdf", "tabulator" ]
  }
}

},{}],"solid.js":[function(require,module,exports){
var Solid = {
  auth: require('./lib/auth'),
  identity: require('./lib/identity'),
  meta: require('./lib/meta'),
  status: require('./lib/status'),
  utils: require('./lib/utils'),
  web: require('./lib/web')
}

if (typeof tabulator !== 'undefined') {
  tabulator.solid = Solid
}

module.exports = Solid

},{"./lib/auth":1,"./lib/identity":2,"./lib/meta":3,"./lib/status":4,"./lib/utils":5,"./lib/web":6}]},{},[]);
