'use strict'
/**
 * Provides Solid helper functions involved with parsing a user's WebId profile.
 * @module identity
 */
module.exports.discoverWebID = discoverWebID
module.exports.getProfile = getProfile
module.exports.loadExtendedProfile = loadExtendedProfile

var graphUtil = require('./util/graph-util')
var webUtil = require('./util/web-util')
var webClient = require('./web')
var SolidProfile = require('./solid/profile')
var vocab = require('./vocab')

/**
 * Discovers a user's WebId (URL) starting from the account/domain URL
 * @method discoverWebID
 * @param url {String} Location of a user's account or domain.
 * @throw {Error} Reason why the WebID could not be discovered
 * @return {Promise<uri>}
 */

function discoverWebID (url) {
  return new Promise(function (resolve, reject) {
    webClient.options(url)
      .then(function (meta) {
        var metaUrl = meta.meta
        if (metaUrl) {
          metaUrl = webUtil.absoluteUrl(metaUrl, url)
          webClient.getParsedGraph(metaUrl)
            .then(function (graph) {
              var webid = graph.any(undefined, vocab.foaf('account'))
              if (webid && webid.uri) {
                resolve(webid.uri)
              } else {
                throw new Error('Could not find a WebID matching the domain ' +
                url)
              }
            })
            .catch(function (err) {
              reject(err)
            })
        } else {
          throw new Error('Could not find a meta URL in the Link header')
        }
      })
      .catch(function (err) {
        reject(err)
      })
  })
}

/**
 * Fetches a user's WebId profile, optionally follows `sameAs` etc links,
 *   and return a promise with a parsed SolidProfile instance.
 * @method getProfile
 * @param profileUrl {String} WebId or Location of a user's profile.
 * @param [options] Options hashmap (see solid.web.solidRequest() function docs)
 * @param [options.ignoreExtended=false] Do not load extended profile if true.
 * @return {Promise<SolidProfile>}
 */
function getProfile (profileUrl, options) {
  options = options || {}
  // Politely ask for Turtle formatted profiles
  options.headers = options.headers || {
    'Accept': 'text/turtle'
  }
  options.noCredentials = true  // profiles are always public
  // Load main profile
  return webClient.get(profileUrl, options)
    .then(function (response) {
      var contentType = response.contentType()
      if (!contentType) {
        throw new Error('Cannot parse profile without a Content-Type: header')
      }
      var parsedProfile = graphUtil.parseGraph(profileUrl, response.raw(),
        contentType)
      var profile = new SolidProfile(profileUrl, parsedProfile, response)
      profile.isLoaded = true
      if (options.ignoreExtended) {
        return profile
      } else {
        return loadExtendedProfile(profile, options)
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
function loadExtendedProfile (profile, options) {
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
