'use strict'
/**
 * Provides Solid helper functions involved with initializing, reading and
 * writing the App Registry resources.
 * @module app-registry
 */

module.exports.addToAppRegistry = addToAppRegistry
module.exports.blankPrivateAppRegistry = blankPrivateAppRegistry
module.exports.blankPublicAppRegistry = blankPublicAppRegistry
module.exports.initAppRegistryPrivate = initAppRegistryPrivate
module.exports.initAppRegistryPublic = initAppRegistryPublic
module.exports.loadAppRegistry = loadAppRegistry
module.exports.appsForType = appsForType
module.exports.registerApp = registerApp
module.exports.registrationsFromGraph = registrationsFromGraph

var AppRegistration = require('./solid/app-registration')
var graphUtil = require('./util/graph-util.js')
var util = require('./util/web-util.js')
var vocab = require('solid-namespace')
var webUtil = require('./util/web-util.js')

/**
 * Adds an RDF class to a user's app registry, and returns the
 * profile (with the appropriate registry graph updated).
 * Called by `registerApp()`, which does all the argument validation.
 * @method addToAppRegistry
 * @param profile {SolidProfile}
 * @param app {AppRegistration}
 * @param webClient {SolidWebClient}
 * @return {Promise<SolidProfile>} Returns updated profile
 */
function addToAppRegistry (profile, app, webClient) {
  // TODO: Check to see if a registry entry for this type already exists.
  var registryUri
  var registryGraph
  if (app.isListed) {
    registryUri = profile.appRegistryListed.uri
    registryGraph = profile.appRegistryListed.graph
  } else {
    registryUri = profile.appRegistryUnlisted.uri
    registryGraph = profile.appRegistryUnlisted.graph
  }
  if (!registryUri) {
    throw new Error('Cannot register app, registry URL missing')
  }
  var rdf = profile.rdf
  // triples to delete (none for the moment)
  var toDel = []
  // Create the list of triples to add in the PATCH operation
  var toAdd = app.rdfStatements(rdf)
  return webClient.patch(registryUri, toDel, toAdd)
    .then(function (response) {
      // Update the profile object with the new registry without reloading
      var newRegistration = graphUtil.graphFromStatements(toAdd, rdf)
      if (registryGraph) {
        graphUtil.appendGraph(registryGraph, newRegistration)
      } else {
        profile[app.isListed ? 'appRegistryListed' : 'appRegistryUnlisted'].graph = newRegistration
      }
      return profile
    })
}

/**
 * Returns a list of registry entries for a profile and a given RDF Class.
 * @method appsForType
 * @param profile {SolidProfile}
 * @param type {NamedNode} RDF Class
 * @param rdf {RDF} RDF Library
 * @return {Array<AppRegistration>}
 */
function appsForType (profile, type, rdf) {
  var registrations = []
  return registrations
    .concat(
      // Public/listed registrations
      registrationsFromGraph(profile.appRegistryListed.graph, type, rdf)
    )
    .concat(
      // Private/unlisted registrations
      registrationsFromGraph(profile.appRegistryUnlisted.graph, type, rdf)
    )
}

/**
 * Returns a blank private app registry option.
 * For use with `initAppRegistry()`.
 * @method blankPrivateAppRegistry
 * @private
 * @return {Object} Blank app registry object
 */
function blankPrivateAppRegistry (rdf) {
  var ns = vocab(rdf)
  var thisDoc = rdf.namedNode('')
  var registryStatements = [
    rdf.triple(thisDoc, ns.rdf('type'), ns.solid('AppRegistry')),
    rdf.triple(thisDoc, ns.rdf('type'), ns.solid('UnlistedDocument'))
  ]
  var registry = {
    data: graphUtil.serializeStatements(registryStatements),
    graph: graphUtil.graphFromStatements(registryStatements, rdf),
    slug: 'privateAppRegistry.ttl',
    uri: null  // actual url not yet known
  }
  return registry
}

/**
 * Returns a blank public app registry option.
 * For use with `initAppRegistry()`.
 * @method blankPublicAppRegistry
 * @private
 * @return {Object} Blank app registry object
 */
function blankPublicAppRegistry (rdf) {
  var ns = vocab(rdf)
  var thisDoc = rdf.namedNode('')
  var registryStatements = [
    rdf.triple(thisDoc, ns.rdf('type'), ns.solid('AppRegistry')),
    rdf.triple(thisDoc, ns.rdf('type'), ns.solid('ListedDocument'))
  ]
  var registry = {
    data: graphUtil.serializeStatements(registryStatements),
    graph: graphUtil.graphFromStatements(registryStatements, rdf),
    slug: 'publicAppRegistry.ttl',
    uri: null  // actual url not yet known
  }
  return registry
}

/**
 * Initializes the private App Registry resource, updates
 * the profile with the initialized registry, and returns the updated profile.
 * @method initAppRegistryPrivate
 * @param profile {SolidProfile} User's WebID profile
 * @param [options={}] Options hashmap (see solid.web.solidRequest()
 *   function docs)
 * @return {Promise<SolidProfile>} Resolves with the updated profile instance.
 */
function initAppRegistryPrivate (profile, webClient, options) {
  options = options || {}
  var rdf = profile.rdf
  var ns = vocab(rdf)
  var registryContainerUri = profile.appRegistryDefaultContainer()
  var webId = rdf.namedNode(profile.webId)
  var registry = blankPrivateAppRegistry(rdf)
  // First, create the private App Registry resource
  return webClient.post(registryContainerUri, registry.data,
    registry.slug)
    .catch(function (err) {
      throw new Error('Could not create private registry document:', err)
    })
    .then(function (response) {
      // Private registry resource created.
      // Update the private profile (preferences) to link to it.
      registry.uri = util.absoluteUrl(webUtil.hostname(registryContainerUri),
        response.url)
      var toAdd = [
        rdf.triple(webId, ns.solid('privateAppRegistry'),
          rdf.namedNode(registry.uri))
      ]
      var toDel = []
      // Note: this PATCH will actually create a private profile if it doesn't
      // already exist.
      return webClient.patch(profile.privateProfileUri(), toDel, toAdd,
        options)
    })
    .catch(function (err) {
      throw new Error('Could not update profile with private registry:' + err)
    })
    .then(function (response) {
      // Profile successfully patched with a link to the created private registry
      // It's safe to update this instance of profile
      profile.appRegistryUnlisted = registry
      // Finally, return the updated profile with registry loaded
      return profile
    })
}

/**
 * Initializes the public App Registry resource, updates
 * the profile with the initialized registry, and returns the updated profile.
 * @method initAppRegistryPublic
 * @param profile {SolidProfile} User's WebID profile
 * @param [options] Options hashmap (see solid.web.solidRequest() function docs)
 * @return {Promise<SolidProfile>} Resolves with the updated profile instance.
 */
function initAppRegistryPublic (profile, webClient, options) {
  options = options || {}
  var rdf = profile.rdf
  var ns = vocab(rdf)
  var registryContainerUri = profile.appRegistryDefaultContainer()
  var webId = rdf.namedNode(profile.webId)
  var registry = blankPublicAppRegistry(rdf)
  // First, create the public registry Registry resource
  return webClient.post(registryContainerUri, registry.data,
    registry.slug)
    .catch(function (err) {
      throw new Error('Could not create public registry document:', err)
    })
    .then(function (response) {
      // Public registry resource created. Update the profile to link to it.
      registry.uri = util.absoluteUrl(webUtil.hostname(registryContainerUri),
        response.url)
      var toAdd = [
        rdf.triple(webId, ns.solid('publicAppRegistry'),
          rdf.namedNode(registry.uri))
      ]
      var toDel = []
      return webClient.patch(profile.webId, toDel, toAdd, options)
    })
    .catch(function (err) {
      throw new Error('Could not update profile with public registry:', err)
    })
    .then(function (response) {
      // Profile successfully patched with a link to the created public registry
      // It's safe to update this instance of profile
      profile.appRegistryListed = registry
      // Finally, return the updated profile with registry loaded
      return profile
    })
}

/**
 * Loads the public and private app registry resources, adds them
 * to the profile, and returns the profile.
 * Called by the profile.loadAppRegistry() alias method.
 * Usage:
 *
 *   ```
 * var profile = solid.getProfile(url, options)
 *   .then(function (profile) {
 *     return profile.loadAppRegistry(options)
 *   })
 *   ```
 * @method loadAppRegistry
 * @param profile {SolidProfile}
 * @param webClient {SolidWebClient}
 * @param [options={}] Options hashmap (see solid.web.solidRequest()
 *   function docs)
 * @return {Promise<SolidProfile>}
 */
function loadAppRegistry (profile, webClient, options) {
  options = options || {}
  options.headers = options.headers || {}
  // Politely ask for Turtle format
  if (!options.headers['Accept']) {
    options.headers['Accept'] = 'text/turtle'
  }
  // load public and private registry resources
  var links = []
  if (profile.appRegistryListed.uri) {
    links.push(profile.appRegistryListed.uri)
  }
  if (profile.appRegistryUnlisted.uri) {
    links.push(profile.appRegistryUnlisted.uri)
  }
  return webClient.loadParsedGraphs(links, options)
    .then(function (loadedGraphs) {
      loadedGraphs.forEach(function (graph) {
        // For each registry resource loaded, add it to `profile.appRegistryListed`
        //  or `profile.appRegistryUnlisted` as appropriate
        if (graph && graph.value) {
          profile.addAppRegistry(graph.value, graph.uri)
        }
      })
      return profile
    })
}

/**
 * Registers a given entry in the app registry.
 * @method registerApp
 * @param profile {SolidProfile}
 * @param app {AppRegistration}
 * @param webClient {SolidWebClient}
 * @return {Promise<SolidProfile>} Returns updated profile.
 */
function registerApp (profile, app, webClient) {
  if (!profile) {
    throw new Error('No profile provided')
  }
  if (!profile.isLoaded) {
    throw new Error('Profile is not loaded')
  }
  if (!app || !app.isValid()) {
    throw new Error('Invalid app registration')
  }
  // make sure app registry is loaded
  return loadAppRegistry(profile, webClient)
    .then(function (profile) {
      if (app.isListed && !profile.hasAppRegistryPublic()) {
        // Public App registry is needed, but doesn't exist. Create it.
        return initAppRegistryPublic(profile, webClient)
      }
      if (!app.isListed && !profile.hasAppRegistryPrivate()) {
        // Private App registry is needed, but doesn't exist. Create it.
        return initAppRegistryPrivate(profile, webClient)
      }
      // Relevant App registry exists, proceed
      return profile
    })
    .then(function (profile) {
      // Made sure the relevant app registry exists, and can now add to it
      return addToAppRegistry(profile, app, webClient)
    })
}

/**
 * Returns a list of registry entries from a given parsed type index graph.
 * @method registrationsFromGraph
 * @param graph {Graph} Parsed type index graph
 * @param type {NamedNode} RDF Class
 * @param rdf {RDF} RDF Library
 * @return {Array<AppRegistration>}
 */
function registrationsFromGraph (graph, type, rdf) {
  var entrySubject
  var ns = vocab(rdf)
  var registrations = []
  if (!graph) {
    return registrations
  }
  graph.statementsMatching(null, ns.app('commonType'), type)
    .forEach(function (entry) {
      entrySubject = entry.subject
      var app = new AppRegistration()
      app.initFromGraph(entrySubject, graph, rdf)
      registrations.push(app)
    })
  return registrations
}
