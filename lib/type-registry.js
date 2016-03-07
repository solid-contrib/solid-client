'use strict'
/**
 * Provides Solid helper functions involved with loading the Type Index
 * Registry files, and with registering resources with them.
 * @module type-registry
 */
module.exports.loadTypeRegistry = loadTypeRegistry
module.exports.isPrivateTypeIndex = isPrivateTypeIndex
module.exports.isPublicTypeIndex = isPublicTypeIndex
module.exports.registerType = registerType

// var graphUtil = require('./util/graph-util')
var webClient = require('./web')
// var SolidProfile = require('./solid/profile')
var vocab = require('./vocab')

function addToTypeIndex (profile, rdfClass, location, accessLevel) {
}

function ensureTypeIndexExists (profile, accessLevel) {
}

/**
 * Returns true if the parsed graph is a `solid:PrivateTypeIndex` document.
 * @method isPrivateTypeIndex
 * @param graph {$rdf.IndexedFormula} Parsed graph (loaded from a type index
 *   resource)
 * @return {Boolean}
 */
function isPrivateTypeIndex (graph) {
  return graph.any(null, null, vocab.solid('PrivateTypeIndex'), graph.uri)
}

/**
 * Returns true if the parsed graph is a `solid:PrivateTypeIndex` document.
 * @method isPublicTypeIndex
 * @param graph {$rdf.IndexedFormula} Parsed graph (loaded from a type index
 *   resource)
 * @return {Boolean}
 */
function isPublicTypeIndex (graph) {
  return graph.any(null, null, vocab.solid('PublicTypeIndex'), graph.uri)
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
  var links = profile.typeIndexes
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
 * @param profile {SolidProfile} Loaded WebID profile
 * @param rdfClass {rdf.NamedNode} Type to register in the index.
 * @param location {String} Absolute URI to the location you want the class
 *   registered to. (Example: Registering Address books in
 *   `https://example.com/contacts/`)
 * @param [accessLevel='private'] {String} Optional type registry access level
 *   (whether to register in a private or public index).
 *   One of 'public' or 'private', defaults to 'private'.
 */
function registerType (profile, rdfClass, location, accessLevel) {
  if (!profile) {
    throw new Error('No profile provided')
  }
  if (!profile.isLoaded) {
    throw new Error('Profile is not loaded')
  }
  if (!rdfClass || !location) {
    throw new Error('Type registration requires type class and location')
  }
  if (!profile.hasStorage()) {
    throw new Error('Profile has no link to root storage')
  }
  accessLevel = accessLevel || 'private'  // default to private
  if (accessLevel !== 'public' && accessLevel !== 'private') {
    throw new Error('Invalid index access level type')
  }
  loadTypeRegistry(profile)  // make sure type registry is loaded
  ensureTypeIndexExists(profile, accessLevel)
  addToTypeIndex(profile, rdfClass, location, accessLevel)
}
