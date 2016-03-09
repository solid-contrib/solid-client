'use strict'
/**
 * Provides Solid helper functions involved with loading the Type Index
 * Registry files, and with registering resources with them.
 * @module type-registry
 */
module.exports.loadTypeRegistry = loadTypeRegistry
module.exports.isUnlistedTypeIndex = isUnlistedTypeIndex
module.exports.isListedTypeIndex = isListedTypeIndex
module.exports.registerType = registerType

// var graphUtil = require('./util/graph-util')
// var rdf = require('./rdf-parser').rdflib
var webClient = require('./web')
// var SolidProfile = require('./solid/profile')
var vocab = require('./vocab')

/**
 * Adds an RDF class to a user's type index registry.
 * Called by `registerTypeIndex()`, which does all the argument validation.
 * @param profile {SolidProfile} User's WebID profile
 * @param rdfClass {rdf.NamedNode} Type to register in the index.
 * @param location {String} Absolute URI  to the location you want the class
 *   registered to.
 * @param accessLevel {String} Type registry access level
 *   (whether to register in a listed or unlisted index).
 *   One of 'listed' or 'unlisted'.
 * @return {Promise<SolidProfile>}
 */
function addToTypeIndex (profile, rdfClass, location, accessLevel) {
  // Check to see if a registry entry for this type already exists.

  // var toAdd = [
  //   rdf.st(
  //     rdf.sym(location), vocab.rdf('type'), vocab.solid('TypeRegistration')
  //   ).toNT(),
  //
  // ]
}

/**
 * Checks to see whether the type index registry of the appropriate type
 * (public or private) exists and is discoverable from the profile.
 * Creates the index file if this is not the case.
 * @method ensureTypeIndexExists
 * @param profile {SolidProfile} User's WebID profile
 * @param accessLevel {String} Type registry access level
 *   (whether to register in a private or public index).
 *   One of 'public' or 'private'.
 * @return {Promise<SolidProfile>}
 */
function ensureTypeIndexExists (profile, accessLevel) {
  return new Promise(function (resolve, reject) {
    resolve(profile)
  })
}

/**
 * Returns true if the parsed graph is a `solid:UnlistedDocument` document.
 * @method isUnlistedTypeIndex
 * @param graph {$rdf.IndexedFormula} Parsed graph (loaded from a type index
 *   resource)
 * @return {Boolean}
 */
function isUnlistedTypeIndex (graph) {
  return graph.any(null, null, vocab.solid('UnlistedDocument'), graph.uri)
}

/**
 * Returns true if the parsed graph is a `solid:ListedDocument` document.
 * @method isListedTypeIndex
 * @param graph {$rdf.IndexedFormula} Parsed graph (loaded from a type index
 *   resource)
 * @return {Boolean}
 */
function isListedTypeIndex (graph) {
  return graph.any(null, null, vocab.solid('ListedDocument'), graph.uri)
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
  options.headers = options.headers || {}
  // Politely ask for Turtle format
  if (!options.headers['Accept']) {
    options.headers['Accept'] = 'text/turtle'
  }
  // load public and private index resources
  var links = []
  if (profile.typeIndexListed.uri) {
    links.push(profile.typeIndexListed.uri)
  }
  if (this.typeIndexUnlisted.uri) {
    links.push(profile.typeIndexUnlisted.uri)
  }
  return webClient.loadParsedGraphs(links, options)
    .then(function (loadedGraphs) {
      loadedGraphs.forEach(function (graph) {
        // For each index resource loaded, add it to `profile.typeIndexListed`
        //  or `profile.typeIndexUnlisted` as appropriate
        if (graph && graph.value) {
          profile.addTypeRegistry(graph.value)
        }
      })
      return profile
    })
}

/**
 * Registers a given RDF class in the user's type index registries, so that
 * other applications can discover it.
 * @method registerType
 * @param profile {SolidProfile} Loaded WebID profile
 * @param rdfClass {rdf.NamedNode} Type to register in the index.
 * @param location {String} Absolute URI to the location you want the class
 *   registered to. (Example: Registering Address books in
 *   `https://example.com/contacts/`)
 * @param [accessLevel='unlisted'] {String} Optional type registry access level
 *   (whether to register in a listed or unlisted index).
 *   One of 'listed' or 'unlisted', defaults to 'unlisted'.
 * @return {Promise<SolidProfile>}
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
  accessLevel = accessLevel || 'unlisted'  // default to unlisted
  if (accessLevel !== 'listed' && accessLevel !== 'unlisted') {
    throw new Error('Invalid index access level type')
  }
  return loadTypeRegistry(profile)  // make sure type registry is loaded
    .then(function (profile) {
      return ensureTypeIndexExists(profile, accessLevel)
    }).catch(function (reason) {
      throw new Error('Unable to create type index registry resource: %s',
        reason)
    })
    .then(function (profile) {
      return addToTypeIndex(profile, rdfClass, location, accessLevel)
    })
}
