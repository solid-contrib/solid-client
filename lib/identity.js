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
 * @param [options] Options hashmap (see solid.web.solidRequest() function docs)
 * @return {Promise<SolidProfile>}
 */
function getProfile (profileUrl, options) {
  options = options || {}
  // Politely ask for Turtle formatted profiles
  options.headers = options.headers || {
    'Accept': 'text/turtle'
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
      return loadExtendedProfile(profile, options)
    })
}

/**
 * Loads the related external profile resources (all the `sameAs` and `seeAlso`
 * links, as well as Preferences), and appends them to the profile's
 * `parsedGraph`. Returns the profile instance.
 * @method loadExtendedProfile
 * @private
 * @param profile {SolidProfile}
 * @param [options] Options hashmap (see solid.web.solidRequest() function docs)
 * @return {Promise<SolidProfile>}
 */
function loadExtendedProfile (profile, options) {
  var links = profile.relatedProfilesLinks()
  return webClient.loadParsedGraphs(links, options)
    .then(function (loadedGraphs) {
      loadedGraphs.forEach(function (graph) {
        if (graph && graph.value) {
          profile.appendFromGraph(graph.value, graph.uri)
        }
      })
      return profile
    })
}

/**
 * Loads the public and private type registry index resources, adds them
 * to the profile, and returns the profile.
 * Called by the profile.loadTypeRegistry() alias method.
 * Usage:
 *
 *   ```
 * var profile = solid.getProfile(url, options)
 *   .then(function (profile) {
 *     return profile.loadTypeRegistry(options)
 *   })
 *   ```
 * @method loadTypeRegistry
 * @param profile {SolidProfile}
 * @param [options] Options hashmap (see solid.web.solidRequest() function docs)
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
          profile.addTypeRegistry(graph.value)
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
