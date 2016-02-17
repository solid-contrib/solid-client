'use strict'
/**
 * Provides Solid helper functions involved with parsing a user's WebId profile.
 * @module identity
 */
module.exports.getProfile = getProfile
module.exports.loadExtendedProfile = loadExtendedProfile
var graphUtil = require('./graph-util')
var webClient = require('./web')
var SolidProfile = require('./solid-profile')

/**
 * Fetches a user's WebId profile, optionally follows `sameAs` etc links,
 *   and return a promise with a parsed SolidProfile instance.
 * @method getProfile
 * @param profileUrl {String} WebId or Location of a user's profile.
 * @param [ignoreExtended=false] {Boolean} Does not fetch external resources
 *   related to the profile, if true.
 * @param proxyUrl {String} URL template of the proxy to use for CORS
 *                          requests.
 * @param timeout {Number} Request timeout in milliseconds.
 * @return {Promise<SolidProfile>}
 */
function getProfile (profileUrl, ignoreExtended, proxyUrl, timeout) {
  var config = require('../config')
  proxyUrl = proxyUrl || config.proxyUrl
  timeout = timeout || config.timeout
  var options = {
    headers: {
      'Accept': 'text/turtle'
    },
    proxyUrl: proxyUrl,
    timeout: timeout
  }
  // Load main profile
  return webClient.get(profileUrl, options)
    .then(function (response) {
      var contentType = response.contentType()
      if (!contentType) {
        // Force contentType if absent (until LDNode proxy is fixed)
        contentType = 'text/turtle'
        // throw new Error('Cannot parse profile without a Content-Type: header')
      }
      return graphUtil.parseGraph(profileUrl, response.raw(), contentType)
    })
    .then(function (parsedProfile) {
      var profile = new SolidProfile(profileUrl, parsedProfile)
      if (ignoreExtended) {
        return profile
      } else {
        return loadExtendedProfile(profile, options)
      }
    })
}

/**
 * Loads the related external profile resources (all the `sameAs` and `seeAlso`
 * links), and appends them to the profile's `parsedGraph`.
 * Returns the profile instance.
 * Usage:
 *
 *   ```
 *   var profile = Solid.identity.getProfile(url, true)  // ignore extended
 *     .then(function (profile) {
 *       // optionally load the extended profile too
 *       return Solid.identity.loadExtendedProfile(profile)
 *     })
 *   ```
 * @method loadExtendedProfile
 * @param profile {SolidProfile}
 * @param [options] Options hashmap (see Solid.web.solidRequest() function docs)
 * @return {Promise<SolidProfile>}
 */
function loadExtendedProfile (profile, options) {
  options = options || {}
  // Politely ask for Turtle formatted profiles
  options.headers = options.headers || {
    'Accept': 'text/turtle'
  }
  var links = profile.relatedProfilesLinks()
  return webClient.loadParsedGraphs(links, options)
    .then(function (loadedGraphs) {
      loadedGraphs.forEach(function (graph) {
        if (graph && graph.value) {
          graphUtil.appendGraph(profile.parsedGraph, graph.value, graph.uri)
        }
      })
      return profile
    })
}
