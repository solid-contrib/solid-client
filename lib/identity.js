'use strict'
/**
 * Provides Solid helper functions involved with parsing a user's WebId profile.
 * @module identity
 */

var solidClient = require('./web')

// common vocabs
// var RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#')
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
