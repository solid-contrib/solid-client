'use strict'
/**
 * Provides Solid helper functions involved with parsing a user's WebId profile.
 * @module identity
 */
module.exports.discoverWebID = discoverWebID
module.exports.getProfile = getProfile
module.exports.loadExtendedProfile = loadExtendedProfile

var SolidProfile = require('./solid/profile')

/**
 * Discovers a user's WebId (URL) starting from the account/domain URL.
 * Usage:
 *
 *   ```
 *   solid.discoverWebID(url)
 *     .then(function (webId) {
 *       console.log('Web ID is: ' + webId)
 *     })
 *     .catch(function (err) {
 *       console.log('Could not discover web id: ' + err)
 *     })
 *   ```
 * @method discoverWebID
 * @param url {String} Location of a user's account or domain.
 * @throw {Error} Reason why the WebID could not be discovered
 * @return {Promise<String>}
 */
function discoverWebID (url, webClient, ns) {
  return webClient.options(url)
    .then(function (response) {
      var metaUrl = response.metaAbsoluteUrl()
      if (!metaUrl) {
        throw new Error('Could not find a meta URL in the Link header')
      }
      return webClient.get(metaUrl)
    })
    .then(function (response) {
      var graph = response.parsedGraph()
      var webId = graph.any(undefined, ns.solid('account'))
      if (!webId || !webId.uri) {
        throw new Error('Could not find a WebID matching the domain ' + url)
      }
      return webId
    })
}

/**
 * Fetches a user's WebId profile, optionally follows `sameAs` etc links,
 *   and return a promise with a parsed SolidProfile instance.
 * @method getProfile
 * @param webId {String} WebId
 * @param [options={}] Options hashmap (see solid.web.solidRequest()
 *   function docs)
 * @param [options.ignoreExtended=false] Do not load extended profile if true.
 * @param webClient {SolidWebClient}
 * @param rdf {RDF} RDF Library
 * @return {Promise<SolidProfile>}
 */
function getProfile (webId, options, webClient, rdf) {
  options = options || {}
  // Politely ask for Turtle formatted profiles
  options.headers = options.headers || {
    'Accept': 'text/turtle'
  }
  options.noCredentials = true  // profiles are always public
  // Load main profile
  return webClient.get(webId, options)
    .then(function (response) {
      var parsedProfile = response.parsedGraph()
      var profile = new SolidProfile(response.url, parsedProfile, rdf, webClient,
        response)
      profile.isLoaded = true
      if (options.ignoreExtended) {
        return profile
      } else {
        return loadExtendedProfile(profile, options, webClient)
      }
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
function loadExtendedProfile (profile, options, webClient) {
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
