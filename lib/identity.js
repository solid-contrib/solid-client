'use strict'
/**
 * Provides Solid helper functions involved with parsing a user's WebId profile.
 * @module identity
 */
module.exports.getProfile = getProfile
module.exports.loadExtendedProfile = loadExtendedProfile
module.exports.loadTypeRegistry = loadTypeRegistry
module.exports.isPrivateTypeIndex = isPrivateTypeIndex
module.exports.isPublicTypeIndex = isPublicTypeIndex

var graphUtil = require('./graph-util')
var webClient = require('./web')
var SolidProfile = require('./solid-profile')
var rdf = require('./rdf-parser').rdflib
var Vocab = require('./vocab')

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
      var parsedProfile = graphUtil.parseGraph(profileUrl, response.raw(),
        contentType)
      var profile = new SolidProfile(profileUrl, parsedProfile, response)
      if (ignoreExtended) {
        return profile
      } else {
        return loadExtendedProfile(profile, options)
      }
    })
}

/**
 * Loads the related external profile resources (all the `sameAs` and `seeAlso`
 * links, as well as Preferences), and appends them to the profile's
 * `parsedGraph`. Returns the profile instance.
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

/**
 * Loads the public and private type registry index resources, adds them
 * to the profile, and returns the profile.
 * Usage:
 *
 *   ```
 * var profile = Solid.identity.getProfile(url)
 *   .then(function (profile) {
 *     return Solid.identity.loadTypeRegistry(profile)
 *   })
 *   ```
 * @method loadTypeRegistry
 * @param profile {SolidProfile}
 * @param [options] Options hashmap (see Solid.web.solidRequest() function docs)
 * @return {Promise<SolidProfile>}
 */
function loadTypeRegistry (profile, options) {
  options = options || {}
  // Politely ask for Turtle formatted type registries
  options.headers = options.headers || {
    'Accept': 'text/turtle'
  }
  // load public and private index resources
  var links = profile.typeIndexes()
  return webClient.loadParsedGraphs(links, options)
    .then(function (loadedGraphs) {
      loadedGraphs.forEach(function (graph) {
        // For each index resource loaded, add it to `profile.typeIndexPublic`
        //  or `profile.typeIndexPrivate` as appropriate
        if (graph && graph.value) {
          profile.addTypeRegistry(graph)
        }
      })
      return profile
    })
}

/**
 * Returns true if the parsed graph is a `solid:PrivateTypeIndex` document.
 * @method isPrivateTypeIndex
 * @param graph {$rdf.IndexedFormula} Parsed graph (loaded from a type index
 *   resource)
 * @return {Boolean}
 */
function isPrivateTypeIndex (graph) {
  var object = rdf.sym(Vocab.SOLID.PrivateTypeIndex)
  return graph.any(null, null, object, graph.uri)
}

/**
 * Returns true if the parsed graph is a `solid:PrivateTypeIndex` document.
 * @method isPublicTypeIndex
 * @param graph {$rdf.IndexedFormula} Parsed graph (loaded from a type index
 *   resource)
 * @return {Boolean}
 */
function isPublicTypeIndex (graph) {
  var object = rdf.sym(Vocab.SOLID.PublicTypeIndex)
  return graph.any(null, null, object, graph.uri)
}
