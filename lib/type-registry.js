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
module.exports.unregisterType = unregisterType
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
 * @param isListed {Boolean} Whether to register in a listed or unlisted index).
 * @return {Promise<SolidProfile>}
 */
function addToTypeIndex (profile, rdfClass, location, locationType,
                         isListed) {
  // TODO: Check to see if a registry entry for this type already exists.
  // Generate a fragment identifier for the new registration
  var hash = require('shorthash')
  var fragmentId = hash.unique(rdfClass.uri)
  var registryUri
  if (isListed) {
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
    .then(function () {
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
 * @param [isListed=false] {Boolean} Whether to register in a listed or unlisted
 *   index). Defaults to `false` (unlisted).
 * @return {Promise<SolidProfile>}
 */
function registerType (profile, rdfClass, location, locationType, isListed) {
  if (!profile) {
    throw new Error('No profile provided')
  }
  if (!profile.isLoaded) {
    throw new Error('Profile is not loaded')
  }
  if (!rdfClass || !location) {
    throw new Error('Type registration requires type class and location')
  }
  locationType = locationType || 'container'
  if (locationType !== 'container' && locationType !== 'instance') {
    throw new Error('Invalid location type')
  }
  return loadTypeRegistry(profile)  // make sure type registry is loaded
    .then(function (profile) {
      if (isListed && !profile.typeIndexListed.graph) {
        throw new Error('Profile has no Listed type index')
      }
      if (!isListed && !profile.typeIndexUnlisted.graph) {
        throw new Error('Profile has no Unlisted type index')
      }
      return addToTypeIndex(profile, rdfClass, location, locationType,
        isListed)
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
  var isListed = true

  return registrations
    .concat(
      registrationsFromGraph(profile.typeIndexListed.graph, rdfClass, isListed)
    )
    .concat(
      registrationsFromGraph(profile.typeIndexUnlisted.graph, rdfClass,
        !isListed)
    )
}

/**
 * Returns a list of registry entries from a given parsed type index graph.
 * @method registrationsFromGraph
 * @param graph {rdf.IndexedFormula} Parsed type index graph
 * @param rdfClass {rdf.NamedNode} RDF Class
 * @param isListed {Boolean} Whether to register in a listed or unlisted index
 * @return {Array<IndexRegistration>}
 */
function registrationsFromGraph (graph, rdfClass, isListed) {
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
        'instance', location.uri, isListed))
    }
    // Now try to find solid:instanceContainer matches
    location = graph.any(entrySubject, vocab.solid('instanceContainer'))
    if (location) {
      registrations.push(new IndexRegistration(entrySubject.uri, rdfClass,
        'container', location.uri, isListed))
    }
  })
  return registrations
}

/**
 * Returns a list of statements related to a given registry entry, to remove
 * them via PATCH, see `removeFromTypeIndex()`.
 * @param registryGraph {$rdf.IndexedFormula} Type index registry graph
 * @param registration {IndexRegistration} Type index registry entry to generate
 *   statements from.
 * @return {Array<String>} List of statements (in "canonical" string format)
 *   related to the registry.
 */
function registryTriplesFor (registryGraph, registration) {
  var statements = []
  // Return all statements related to the registry entry (that have it as
  // the subject)
  registryGraph.statementsMatching(rdf.sym(registration.registrationUri))
    .forEach(function (match) {
      statements.push(match.toNT())
    })
  return statements
}

/**
 * Removes an RDF class from a user's type index registry.
 * Called by `unregisterTypeIndex()`, which does all the argument validation.
 * @param profile {SolidProfile} User's WebID profile
 * @param rdfClass {rdf.NamedNode} Type to remove from the registry
 * @param isListed {Boolean} Whether to remove from a listed or unlisted index
 * @param [location] {String} If present, only unregister the class from this
 *   location (absolute URI).
 * @return {Promise<SolidProfile>}
 */
function removeFromTypeIndex (profile, rdfClass, isListed, location) {
  var registryUri
  var registryGraph
  if (isListed) {
    registryUri = profile.typeIndexListed.uri
    registryGraph = profile.typeIndexListed.graph
  } else {
    registryUri = profile.typeIndexUnlisted.uri
    registryGraph = profile.typeIndexUnlisted.graph
  }
  if (!registryUri) {
    throw new Error('Cannot unregister type, registry URL missing')
  }
  // Get the existing registrations
  var registrations = registrationsFromGraph(registryGraph, rdfClass, isListed)
  if (registrations.length === 0) {
    // No existing registrations, no need to do anything, just return profile
    return new Promise(function (resolve, reject) {
      resolve(profile)
    })
  }
  if (location) {
    // If location is present, filter the to-remove list only to registrations
    // that are in that location.
    registrations = registrations.filter(function (registration) {
      return registration.locationUri === location
    })
  }
  // Generate triples to delete
  var toDel = []
  registrations.forEach(function (registration) {
    toDel = toDel.concat(registryTriplesFor(registryGraph, registration))
  })
  // Nothing to add
  var toAdd = []
  return webClient.patch(registryUri, toDel, toAdd)
    .then(function (result) {
      // Update the registry, to reflect new state
      return profile.loadTypeRegistry()
    })
}

/**
 * Removes a given RDF class from a user's type index registry, so that
 * other applications can discover it.
 * @method unregisterType
 * @param profile {SolidProfile} Loaded WebID profile
 * @param rdfClass {rdf.NamedNode} Type to register in the index.
 * @param [isListed=false] {Boolean} Whether to remove from a listed or unlisted
 *   index). Defaults to `false` (unlisted).
 * @param [location] {String} If present, only unregister the class from this
 *   location (absolute URI).
 * @return {Promise<SolidProfile>}
 */
function unregisterType (profile, rdfClass, isListed, location) {
  if (!profile) {
    throw new Error('No profile provided')
  }
  if (!profile.isLoaded) {
    throw new Error('Profile is not loaded')
  }
  if (!rdfClass) {
    throw new Error('Unregistering a type requires type class')
  }
  return loadTypeRegistry(profile)  // make sure type registry is loaded
    .then(function (profile) {
      if (isListed && !profile.typeIndexListed.graph) {
        throw new Error('Profile has no Listed type index')
      }
      if (!isListed && !profile.typeIndexUnlisted.graph) {
        throw new Error('Profile has no Unlisted type index')
      }
      return removeFromTypeIndex(profile, rdfClass, isListed, location)
    })
}
