'use strict'
/**
 * Provides Solid helper functions involved with initializing, reading and
 * writing the App Registry resources.
 * @module app-registry
 */

module.exports.blankPrivateAppRegistry = blankPrivateAppRegistry
module.exports.blankPublicAppRegistry = blankPublicAppRegistry
module.exports.initAppRegistryPrivate = initAppRegistryPrivate
module.exports.initAppRegistryPublic = initAppRegistryPublic
module.exports.loadAppRegistry = loadAppRegistry

var graphUtil = require('./util/graph-util.js')
var rdf = require('./util/rdf-parser').rdflib
var util = require('./util/web-util.js')
var vocab = require('./vocab')
var webClient = require('./web')
var webUtil = require('./util/web-util.js')

/**
 * Returns a blank private app registry option.
 * For use with `initAppRegistry()`.
 * @method blankPrivateAppRegistry
 * @private
 * @return {Object} Blank app registry object
 */
function blankPrivateAppRegistry () {
  var thisDoc = rdf.sym('')
  var registryStatements = [
    rdf.st(thisDoc, vocab.rdf('type'), vocab.solid('AppRegistry')),
    rdf.st(thisDoc, vocab.rdf('type'), vocab.solid('UnlistedDocument'))
  ]
  var registry = {
    data: graphUtil.serializeStatements(registryStatements),
    graph: graphUtil.graphFromStatements(registryStatements),
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
function blankPublicAppRegistry () {
  var thisDoc = rdf.sym('')
  var registryStatements = [
    rdf.st(thisDoc, vocab.rdf('type'), vocab.solid('AppRegistry')),
    rdf.st(thisDoc, vocab.rdf('type'), vocab.solid('ListedDocument'))
  ]
  var registry = {
    data: graphUtil.serializeStatements(registryStatements),
    graph: graphUtil.graphFromStatements(registryStatements),
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
 * @param [options] Options hashmap (see solid.web.solidRequest() function docs)
 * @return {Promise<SolidProfile>} Resolves with the updated profile instance.
 */
function initAppRegistryPrivate (profile, options) {
  options = options || {}
  var registryContainerUri = profile.appRegistryDefaultContainer()
  var webId = rdf.sym(profile.webId)
  var registry = blankPrivateAppRegistry()
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
        rdf.st(webId, vocab.solid('privateAppRegistry'), rdf.sym(registry.uri))
      ]
      var toDel = []
      // Note: this PATCH will actually create a private profile if it doesn't
      // already exist.
      return webClient.patch(profile.privateProfileUri(), toDel, toAdd, options)
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
function initAppRegistryPublic (profile, options) {
  options = options || {}
  var registryContainerUri = profile.appRegistryDefaultContainer()
  var webId = rdf.sym(profile.webId)
  var registry = blankPublicAppRegistry()
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
        rdf.st(webId, vocab.solid('publicAppRegistry'), rdf.sym(registry.uri))
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
 * @param [options] Options hashmap (see solid.web.solidRequest() function docs)
 * @return {Promise<SolidProfile>}
 */
function loadAppRegistry (profile, options) {
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
