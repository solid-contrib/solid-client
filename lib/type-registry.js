'use strict'
/**
 * Provides Solid helper functions involved with loading the Type Index
 * Registry files, and with registering resources with them.
 * @module type-registry
 */
module.exports.blankPrivateTypeIndex = blankPrivateTypeIndex
module.exports.blankPublicTypeIndex = blankPublicTypeIndex
module.exports.initTypeRegistryPrivate = initTypeRegistryPrivate
module.exports.initTypeRegistryPublic = initTypeRegistryPublic
module.exports.isUnlistedTypeIndex = isUnlistedTypeIndex
module.exports.isListedTypeIndex = isListedTypeIndex
module.exports.loadTypeRegistry = loadTypeRegistry
module.exports.registerType = registerType
module.exports.typeRegistryForClass = typeRegistryForClass
module.exports.unregisterType = unregisterType

// var graphUtil = require('./util/graph-util')
var IndexRegistration = require('./solid/index-registration')
var rdf = require('./util/rdf-parser').rdflib
var webClient = require('./web')
// var SolidProfile = require('./solid/profile')
var util = require('./util/web-util.js')
var graphUtil = require('./util/graph-util.js')
var vocab = require('./vocab')

/**
 * Returns a blank private type index registry option.
 * For use with `initTypeRegistry()`.
 * @method blankPrivateTypeIndex
 * @private
 * @return {Object} Blank type index registry object
 */
function blankPrivateTypeIndex () {
  var thisDoc = rdf.sym('')
  var indexStatements = [
    rdf.st(thisDoc, vocab.rdf('type'), vocab.solid('TypeIndex')),
    rdf.st(thisDoc, vocab.rdf('type'), vocab.solid('UnlistedDocument'))
  ]
  var publicIndex = {
    data: graphUtil.serializeStatements(indexStatements),
    graph: graphUtil.graphFromStatements(indexStatements),
    slug: 'privateTypeIndex.ttl',
    uri: null  // actual url not yet known
  }
  return publicIndex
}

/**
 * Returns a blank public type index registry option.
 * For use with `initTypeRegistry()`.
 * @method blankPublicTypeIndex
 * @private
 * @return {Object} Blank type index registry object
 */
function blankPublicTypeIndex () {
  var thisDoc = rdf.sym('')
  var indexStatements = [
    rdf.st(thisDoc, vocab.rdf('type'), vocab.solid('TypeIndex')),
    rdf.st(thisDoc, vocab.rdf('type'), vocab.solid('ListedDocument'))
  ]
  var publicIndex = {
    data: graphUtil.serializeStatements(indexStatements),
    graph: graphUtil.graphFromStatements(indexStatements),
    slug: 'publicTypeIndex.ttl',
    uri: null  // actual url not yet known
  }
  return publicIndex
}

/**
 * Initializes the private Type Index Registry resource, updates
 * the profile with the initialized index, and returns the updated profile.
 * @method initTypeRegistryPrivate
 * @param profile {SolidProfile} User's WebID profile
 * @param [options] Options hashmap (see solid.web.solidRequest() function docs)
 * @return {Promise<SolidProfile>} Resolves with the updated profile instance.
 */
function initTypeRegistryPrivate (profile, options) {
  var registryContainerUri = profile.typeRegistryDefaultUri()
  var webId = rdf.sym(profile.webId)
  var privateIndex = blankPrivateTypeIndex()
  // First, create the private Type Index Registry resource
  return webClient.post(registryContainerUri, privateIndex.data,
                        privateIndex.slug, options)
    .catch(function (err) {
      throw new Error('Could not create privateIndex document:', err)
    })
    .then(function (response) {
      // Private type index resource created.
      // Update the private profile (preferences) to link to it.
      privateIndex.uri = util.absoluteUrl(registryContainerUri, response.url)
      var toAdd = [
        rdf.st(webId, vocab.solid('privateTypeIndex'), rdf.sym(privateIndex.uri))
      ]
      var toDel = []
      // Note: this PATCH will actually create a private profile if it doesn't
      // already exist.
      return webClient.patch(profile.privateProfileUri(), toDel, toAdd, options)
    })
    .catch(function (err) {
      throw new Error('Could not update profile with private index:' + err)
    })
    .then(function (response) {
      // Profile successfully patched with a link to the created private index
      // It's safe to update this instance of profile
      profile.typeIndexUnlisted = privateIndex
      // Finally, return the updated profile with type index loaded
      return profile
    })
}

/**
 * Initializes the public Type Index Registry resource, updates
 * the profile with the initialized index, and returns the updated profile.
 * @method initTypeRegistryPublic
 * @param profile {SolidProfile} User's WebID profile
 * @param [options] Options hashmap (see solid.web.solidRequest() function docs)
 * @return {Promise<SolidProfile>} Resolves with the updated profile instance.
 */
function initTypeRegistryPublic (profile, options) {
  var registryContainerUri = profile.typeRegistryDefaultUri()
  var webId = rdf.sym(profile.webId)
  var publicIndex = blankPublicTypeIndex()
  // First, create the public Type Index Registry resource
  return webClient.post(registryContainerUri, publicIndex.data,
                        publicIndex.slug, options)
    .catch(function (err) {
      throw new Error('Could not create publicIndex document:', err)
    })
    .then(function (response) {
      // Public type index resource created. Update the profile to link to it.
      publicIndex.uri = util.absoluteUrl(registryContainerUri, response.url)
      var toAdd = [
        rdf.st(webId, vocab.solid('publicTypeIndex'), rdf.sym(publicIndex.uri))
      ]
      var toDel = []
      return webClient.patch(profile.webId, toDel, toAdd, options)
    })
    .catch(function (err) {
      throw new Error('Could not update profile with public index:', err)
    })
    .then(function (response) {
      // Profile successfully patched with a link to the created public index
      // It's safe to update this instance of profile
      profile.typeIndexListed = publicIndex
      // Finally, return the updated profile with type index loaded
      return profile
    })
}

/**
 * Adds an RDF class to a user's type index registry, and returns the
 * profile (with the appropriate type registry index updated).
 * Called by `registerTypeIndex()`, which does all the argument validation.
 * @method addToTypeIndex
 * @param profile {SolidProfile} User's WebID profile
 * @param rdfClass {NamedNode} RDF type to register in the index.
 * @param location {String} Absolute URI to the location you want the class
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
  var registryGraph
  if (isListed) {
    registryUri = profile.typeIndexListed.uri
    registryGraph = profile.typeIndexListed.graph
  } else {
    registryUri = profile.typeIndexUnlisted.uri
    registryGraph = profile.typeIndexUnlisted.graph
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
    // Add trailing slash if it's missing and is a container
    if (location.lastIndexOf('/') !== location.length - 1) {
      location += '/'
    }
  }
  // triples to delete (none for the moment)
  var toDel = []
  // Create the list of triples to add in the PATCH operation
  var toAdd = [
    // example: '<#ab09fd> a solid:TypeRegistration;'
    rdf.st(registrationUri, vocab.rdf('type'), vocab.solid('TypeRegistration')),
    // example: 'solid:forClass sioc:Post;'
    rdf.st(registrationUri, vocab.solid('forClass'), rdfClass),
    // example: 'solid:instanceContainer </posts/>.'
    rdf.st(registrationUri, locationTypeClass, rdf.sym(location))
  ]
  return webClient.patch(registryUri, toDel, toAdd)
    .then(function (response) {
      // Update the profile object with the new registry without reloading
      if (!registryGraph) {
        registryGraph = graphUtil.graphFromStatements(toAdd)
      }
      return profile
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
 * Note: If the relevant type index registry does not exist, it will be created.
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
 * @return {Promise<SolidProfile>} Resolves with the updated profile.
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
      if (isListed && !profile.hasTypeRegistryPublic()) {
        // Public type registry is needed, but doesn't exist. Create it.
        return initTypeRegistryPublic(profile)
      }
      if (!isListed && !profile.hasTypeRegistryPrivate()) {
        // Private type registry is needed, but doesn't exist. Create it.
        return initTypeRegistryPrivate(profile)
      }
      // Relevant type registry exists, proceed
      return profile
    })
    .then(function (profile) {
      // Made sure the relevant type registry exists, and can now add to it
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
      // Public/listed registrations
      registrationsFromGraph(profile.typeIndexListed.graph, rdfClass, isListed)
    )
    .concat(
      // Private/unlisted registrations
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
  var entrySubject, instanceMatches, containerMatches
  var registrations = []
  if (!graph) {
    return registrations
  }
  var matches = graph.statementsMatching(null, null, rdfClass)
  matches.forEach(function (match) {
    entrySubject = match.subject
    // Have the hash fragment of the registration, now need to determine
    // location type, and the actual location.
    instanceMatches =
      graph.statementsMatching(entrySubject, vocab.solid('instance'))
    instanceMatches.forEach(function (location) {
      registrations.push(new IndexRegistration(entrySubject.uri, rdfClass,
        'instance', location.object.uri, isListed))
    })
    // Now try to find solid:instanceContainer matches
    containerMatches =
      graph.statementsMatching(entrySubject, vocab.solid('instanceContainer'))
    containerMatches.forEach(function (location) {
      registrations.push(new IndexRegistration(entrySubject.uri, rdfClass,
        'container', location.object.uri, isListed))
    })
  })
  return registrations
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
    return Promise.resolve(profile)
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
    registryGraph.statementsMatching(rdf.sym(registration.registrationUri))
      .forEach(function (statement) {
        toDel.push(statement)
      })
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
 * @throws {Error}
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
