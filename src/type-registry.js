'use strict'
/**
 * Provides Solid helper functions involved with loading the Type Index
 * Registry files, and with registering resources with them.
 * @module type-registry
 */
module.exports.addToTypeIndex = addToTypeIndex
module.exports.blankPrivateTypeIndex = blankPrivateTypeIndex
module.exports.blankPublicTypeIndex = blankPublicTypeIndex
module.exports.initTypeRegistryPrivate = initTypeRegistryPrivate
module.exports.initTypeRegistryPublic = initTypeRegistryPublic
module.exports.loadTypeRegistry = loadTypeRegistry
module.exports.registerType = registerType
module.exports.typeRegistryForClass = typeRegistryForClass
module.exports.unregisterType = unregisterType

var IndexRegistration = require('./solid/index-registration')
var util = require('./util/web-util.js')
var graphUtil = require('./util/graph-util.js')
var webUtil = require('./util/web-util.js')
var vocab = require('solid-namespace')

/**
 * Returns a blank private type index registry option.
 * For use with `initTypeRegistry()`.
 * @method blankPrivateTypeIndex
 * @private
 * @return {Object} Blank type index registry object
 */
function blankPrivateTypeIndex (rdf) {
  var thisDoc = rdf.namedNode('')
  var ns = vocab(rdf)
  var indexStatements = [
    rdf.triple(thisDoc, ns.rdf('type'), ns.solid('TypeIndex')),
    rdf.triple(thisDoc, ns.rdf('type'), ns.solid('UnlistedDocument'))
  ]
  var privateIndex = {
    data: graphUtil.serializeStatements(indexStatements),
    graph: graphUtil.graphFromStatements(indexStatements, rdf),
    slug: 'privateTypeIndex.ttl',
    uri: null  // actual url not yet known
  }
  return privateIndex
}

/**
 * Returns a blank public type index registry option.
 * For use with `initTypeRegistry()`.
 * @method blankPublicTypeIndex
 * @private
 * @return {Object} Blank type index registry object
 */
function blankPublicTypeIndex (rdf) {
  var thisDoc = rdf.namedNode('')
  var ns = vocab(rdf)
  var indexStatements = [
    rdf.triple(thisDoc, ns.rdf('type'), ns.solid('TypeIndex')),
    rdf.triple(thisDoc, ns.rdf('type'), ns.solid('ListedDocument'))
  ]
  var publicIndex = {
    data: graphUtil.serializeStatements(indexStatements),
    graph: graphUtil.graphFromStatements(indexStatements, rdf),
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
function initTypeRegistryPrivate (profile, webClient, options) {
  options = options || {}
  var rdf = webClient.rdf
  var ns = vocab(rdf)
  var registryContainerUri = profile.typeRegistryDefaultContainer()
  var webId = rdf.namedNode(profile.webId)
  var privateIndex = blankPrivateTypeIndex(rdf)
  // First, create the private Type Index Registry resource
  return webClient.post(registryContainerUri, privateIndex.data,
                        privateIndex.slug)
    .catch(function (err) {
      throw new Error('Could not create privateIndex document:', err)
    })
    .then(function (response) {
      // Private type index resource created.
      // Update the private profile (preferences) to link to it.
      privateIndex.uri = util.absoluteUrl(
        webUtil.hostname(registryContainerUri),
        response.url
      )
      var toAdd = [
        rdf.triple(webId, ns.solid('privateTypeIndex'),
          rdf.namedNode(privateIndex.uri))
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
 * @param webClient {SolidWebClient}
 * @param [options] Options hashmap (see solid.web.solidRequest() function docs)
 * @return {Promise<SolidProfile>} Resolves with the updated profile instance.
 */
function initTypeRegistryPublic (profile, webClient, options) {
  options = options || {}
  var rdf = webClient.rdf
  var ns = vocab(rdf)
  var registryContainerUri = profile.typeRegistryDefaultContainer()
  var webId = rdf.namedNode(profile.webId)
  var publicIndex = blankPublicTypeIndex(rdf)
  // First, create the public Type Index Registry resource
  return webClient.post(registryContainerUri, publicIndex.data,
                        publicIndex.slug)
    .catch(function (err) {
      throw new Error('Could not create publicIndex document:', err)
    })
    .then(function (response) {
      // Public type index resource created. Update the profile to link to it.
      publicIndex.uri = util.absoluteUrl(
        webUtil.hostname(registryContainerUri),
        response.url
      )
      var toAdd = [
        rdf.triple(webId, ns.solid('publicTypeIndex'),
          rdf.namedNode(publicIndex.uri))
      ]
      var toDel = []
      return webClient.patch(profile.webId, toDel, toAdd, options)
    })
    .catch(function (err) {
      console.log(err)
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
function addToTypeIndex (profile, rdfClass, location, webClient,
                         locationType, isListed) {
  // TODO: Check to see if a registry entry for this type already exists.
  // Generate a fragment identifier for the new registration
  var hash = require('shorthash')
  var rdf = webClient.rdf
  var ns = vocab(rdf)
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
  var registrationUri = rdf.namedNode(registryUri + '#' + fragmentId)
  // Set the class for the location type
  var locationTypeClass
  if (locationType === 'instance') {
    locationTypeClass = ns.solid('instance')
  } else {
    locationTypeClass = ns.solid('instanceContainer')
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
    rdf.triple(registrationUri, ns.rdf('type'), ns.solid('TypeRegistration')),
    // example: 'solid:forClass sioc:Post;'
    rdf.triple(registrationUri, ns.solid('forClass'), rdfClass),
    // example: 'solid:instanceContainer </posts/>.'
    rdf.triple(registrationUri, locationTypeClass, rdf.namedNode(location))
  ]
  return webClient.patch(registryUri, toDel, toAdd)
    .then(function (response) {
      // Update the profile object with the new registry without reloading
      var newRegistration = graphUtil.graphFromStatements(toAdd, rdf)
      if (registryGraph) {
        graphUtil.appendGraph(registryGraph, newRegistration)
      } else {
        profile[isListed ? 'typeIndexListed' : 'typeIndexUnlisted'].graph = newRegistration
      }
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
 * @param webClient {SolidWebClient}
 * @param [options] Options hashmap (see solid.web.solidRequest() function docs)
 * @return {Promise<SolidProfile>}
 */
function loadTypeRegistry (profile, webClient, options) {
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
      const allFailed = loadedGraphs.length &&
        loadedGraphs.reduce((acc, cur) => acc && !cur.value, true)
      if (allFailed) {
        throw new Error('Could not load any type index')
      }
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
 * @param webClient {SolidWebClient}
 * @return {Promise<SolidProfile>} Resolves with the updated profile.
 */
function registerType (profile, rdfClass, location, locationType, isListed,
                       webClient) {
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
  // make sure type registry is loaded
  return loadTypeRegistry(profile, webClient)
    .then(function (profile) {
      if (isListed && !profile.hasTypeRegistryPublic()) {
        // Public type registry is needed, but doesn't exist. Create it.
        return initTypeRegistryPublic(profile, webClient)
      }
      if (!isListed && !profile.hasTypeRegistryPrivate()) {
        // Private type registry is needed, but doesn't exist. Create it.
        return initTypeRegistryPrivate(profile, webClient)
      }
      // Relevant type registry exists, proceed
      return profile
    })
    .then(function (profile) {
      // Made sure the relevant type registry exists, and can now add to it
      return addToTypeIndex(profile, rdfClass, location, webClient,
        locationType, isListed)
    })
}

/**
 * Returns lists of registry entries for a profile and a given RDF Class.
 * @method typeRegistryForClass
 * @param profile {SolidProfile}
 * @param rdfClass {rdf.NamedNode} RDF Class
 * @return {Array<IndexRegistration>}
 */
function typeRegistryForClass (profile, rdfClass, rdf) {
  var registrations = []
  var isListed = true

  return registrations
    .concat(
      // Public/listed registrations
      registrationsFromGraph(profile.typeIndexListed.graph, rdfClass, isListed, rdf)
    )
    .concat(
      // Private/unlisted registrations
      registrationsFromGraph(profile.typeIndexUnlisted.graph, rdfClass,
        !isListed, rdf)
    )
}

/**
 * Returns a list of registry entries from a given parsed type index graph.
 * @method registrationsFromGraph
 * @param graph {Graph} Parsed type index graph
 * @param rdfClass {NamedNode} RDF Class
 * @param isListed {Boolean} Whether to register in a listed or unlisted index
 * @return {Array<IndexRegistration>}
 */
function registrationsFromGraph (graph, rdfClass, isListed, rdf) {
  var entrySubject, instanceMatches, containerMatches
  var ns = vocab(rdf)
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
      graph.statementsMatching(entrySubject, ns.solid('instance'))
    instanceMatches.forEach(function (location) {
      registrations.push(new IndexRegistration(entrySubject.uri, rdfClass,
        'instance', location.object.uri, isListed))
    })
    // Now try to find solid:instanceContainer matches
    containerMatches =
      graph.statementsMatching(entrySubject, ns.solid('instanceContainer'))
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
 * @param rdfClass {NamedNode} Type to remove from the registry
 * @param webClient {SolidWebClient}
 * @param [isListed=false] {Boolean} Whether to remove from a listed or
 *   unlisted index
 * @param [location] {String} If present, only unregister the class from this
 *   location (absolute URI).
 * @return {Promise<SolidProfile>}
 */
function removeFromTypeIndex (profile, rdfClass, webClient, isListed,
                              location) {
  var rdf = webClient.rdf
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
  var registrations = registrationsFromGraph(registryGraph, rdfClass,
    isListed, rdf)
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
    registryGraph.statementsMatching(rdf.namedNode(registration.registrationUri))
      .forEach(function (statement) {
        toDel.push(statement)
      })
  })
  // Nothing to add
  var toAdd = []
  return webClient.patch(registryUri, toDel, toAdd)
    .then(function (result) {
      // Update the registry, to reflect new state
      return profile.reloadTypeRegistry(webClient)
    })
}

/**
 * Removes a given RDF class from a user's type index registry, so that
 * other applications can discover it.
 * @method unregisterType
 * @param profile {SolidProfile} Loaded WebID profile
 * @param rdfClass {NamedNode} Type to register in the index.
 * @param [isListed=false] {Boolean} Whether to remove from a listed or unlisted
 *   index). Defaults to `false` (unlisted).
 * @param [location] {String} If present, only unregister the class from this
 *   location (absolute URI).
 * @param webClient {SolidWebClient}
 * @throws {Error}
 * @return {Promise<SolidProfile>}
 */
function unregisterType (profile, rdfClass, isListed, location, webClient) {
  if (!profile) {
    throw new Error('No profile provided')
  }
  if (!profile.isLoaded) {
    throw new Error('Profile is not loaded')
  }
  if (!rdfClass) {
    throw new Error('Unregistering a type requires type class')
  }
  // make sure type registry is loaded
  return loadTypeRegistry(profile, webClient)
    .then(function (profile) {
      if (isListed && !profile.typeIndexListed.graph) {
        throw new Error('Profile has no Listed type index')
      }
      if (!isListed && !profile.typeIndexUnlisted.graph) {
        throw new Error('Profile has no Unlisted type index')
      }
      return removeFromTypeIndex(profile, rdfClass, webClient, isListed, location)
    })
}
