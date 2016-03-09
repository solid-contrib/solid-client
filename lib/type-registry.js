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
module.exports.typeRegistryForClass = typeRegistryForClass

// var graphUtil = require('./util/graph-util')
var IndexRegistration = require('./solid/index-registration')
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
  accessLevel = accessLevel || 'unlisted'  // default to unlisted
  if (accessLevel !== 'listed' && accessLevel !== 'unlisted') {
    throw new Error('Invalid index access level type')
  }
  return loadTypeRegistry(profile)  // make sure type registry is loaded
    .then(function (profile) {
      if (accessLevel === 'listed' && !profile.typeIndexListed.graph) {
        throw new Error('Profile has no Listed type index')
      }
      if (accessLevel === 'unlisted' && !profile.typeIndexUnlisted.graph) {
        throw new Error('Profile has no Unlisted type index')
      }
      return addToTypeIndex(profile, rdfClass, location, accessLevel)
    })
}

/**
 * Returns lists of registry entries for a given RDF Class.
 * @method typeRegistryForClass
 * @param profile {SolidProfile}
 * @param rdfClass {rdf.NamedNode} RDF Class symbol
 * @return {Array<IndexRegistration>}
 */
function typeRegistryForClass (profile, rdfClass) {
  var registrations = []

  return registrations
    .concat(
      registrationsFromGraph(profile.typeIndexListed.graph, rdfClass,
        'listed')
    )
    .concat(
      registrationsFromGraph(profile.typeIndexUnlisted.graph, rdfClass,
        'unlisted')
    )
}

function registrationsFromGraph (graph, rdfClass, accessLevel) {
  var entrySubject
  var location
  var registrations = []
  if (!graph) {
    return registrations
  }

  var matches = graph.statementsMatching(null, null, rdfClass)
  matches.forEach(function (match) {
    entrySubject = match.subject
    // Have the hash fragment of the registration, now need to determine
    // location type, and the actual location.
    location = graph.any(entrySubject, vocab.solid('instance'))
    if (location) {
      registrations.push(new IndexRegistration(entrySubject.uri, rdfClass,
        'instance', location.uri, accessLevel))
    }
    // Now try to find solid:instanceContainer matches
    location = graph.any(entrySubject, vocab.solid('instanceContainer'))
    if (location) {
      registrations.push(new IndexRegistration(entrySubject.uri, rdfClass,
        'container', location.uri, accessLevel))
    }
  })
  return registrations
}
