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
var rdf = require('./util/rdf-parser').rdflib
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
 * @param locationType {String} Either 'instance' or 'container'
 * @param accessLevel {String} Type registry access level
 *   (whether to register in a listed or unlisted index).
 *   One of 'listed' or 'unlisted'.
 * @return {Promise<SolidProfile>}
 */
function addToTypeIndex (profile, rdfClass, location, locationType,
                         accessLevel) {
  // TODO: Check to see if a registry entry for this type already exists.
  // Generate a fragment identifier for the new registration
  var hash = require('shorthash')
  var fragmentId = hash.unique(rdfClass.uri)
  var registryUri
  if (accessLevel === 'listed') {
    registryUri = profile.typeIndexListed.uri
  } else {
    registryUri = profile.typeIndexUnlisted.uri
  }
  if (!registryUri) {
    throw new Error('Cannot register type, registry URL missing')
  }
  var registrationUri = rdf.sym(registryUri + '#' + fragmentId)
  // Set the class for the location type
  var locationTypeClass
  if (locationType === 'instance') {
    locationTypeClass = vocab.solid('instance')
  } else {
    locationTypeClass = vocab.solid('instanceContainer')
  }
  // triples to delete
  var toDel = null
  // Assemble the list of triples to add in the PATCH operation
  var toAdd = [
    // <#ab09fd> a solid:TypeRegistration;
    rdf.st(
      registrationUri,
      vocab.rdf('type'),
      vocab.solid('TypeRegistration')
    ).toNT(),
    // solid:forClass sioc:Post;
    rdf.st(
      registrationUri,
      vocab.solid('forClass'),
      rdfClass
    ).toNT(),
    // solid:instanceContainer </posts/>.
    rdf.st(
      registrationUri,
      locationTypeClass,
      rdf.sym(location)
    ).toNT()
  ]
  return webClient.patch(registryUri, toDel, toAdd)
    .then(function (result) {
      // Update the registry, to reflect new state
      return profile.loadTypeRegistry()
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
  if (profile.typeIndexUnlisted.uri) {
    links.push(profile.typeIndexUnlisted.uri)
  }
  return webClient.loadParsedGraphs(links, options)
    .then(function (loadedGraphs) {
      loadedGraphs.forEach(function (graph) {
        // For each index resource loaded, add it to `profile.typeIndexListed`
        //  or `profile.typeIndexUnlisted` as appropriate
        if (graph && graph.value) {
          profile.addTypeRegistry(graph.value, graph.uri)
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
 * @param [locationType='container'] {String} Either 'instance' or 'container',
 *   defaults to 'container'
 * @param [accessLevel='unlisted'] {String} Optional type registry access level
 *   (whether to register in a listed or unlisted index).
 *   One of 'listed' or 'unlisted', defaults to 'unlisted'.
 * @return {Promise<SolidProfile>}
 */
function registerType (profile, rdfClass, location, locationType, accessLevel) {
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
  locationType = locationType || 'container'
  if (locationType !== 'container' && locationType !== 'instance') {
    throw new Error('Invalid location type')
  }
  return loadTypeRegistry(profile)  // make sure type registry is loaded
    .then(function (profile) {
      if (accessLevel === 'listed' && !profile.typeIndexListed.graph) {
        throw new Error('Profile has no Listed type index')
      }
      if (accessLevel === 'unlisted' && !profile.typeIndexUnlisted.graph) {
        throw new Error('Profile has no Unlisted type index')
      }
      return addToTypeIndex(profile, rdfClass, location, locationType,
        accessLevel)
    })
}

/**
 * Returns lists of registry entries for a profile and a given RDF Class.
 * @method typeRegistryForClass
 * @param profile {SolidProfile}
 * @param rdfClass {rdf.NamedNode} RDF Class
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

/**
 * Returns a list of registry entries from a given parsed type index graph.
 * @method registrationsFromGraph
 * @param graph {rdf.IndexedFormula} Parsed type index graph
 * @param rdfClass {rdf.NamedNode} RDF Class
 * @param accessLevel {String} One of 'listed' or 'unlisted'
 * @returns {Array<IndexRegistration>}
 */
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
