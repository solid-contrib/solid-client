'use strict'
/**
 * @module permissions
 */

var PermissionSet = require('./permission-set')

/**
 * Fetches and returns a PermissionSet initialized from an ACL resource.
 * @method getPermissions
 * @param resourceUrl {String}
 * @param webClient {SolidWebClient}
 * @return {Promise<PermissionSet>}
 */
function getPermissions (resourceUrl, webClient) {
  var aclResourceUrl
  var permissions
  return webClient.head(resourceUrl)
    .then(function (response) {
      aclResourceUrl = response.aclAbsoluteUrl()
      if (!aclResourceUrl) {
        throw new Error('ACL URL not found for resource.')
      }
      permissions =
        new PermissionSet(resourceUrl, aclResourceUrl, response.isContainer())
      return webClient.getParsedGraph(aclResourceUrl)
    })
    .then(function (aclGraph) {
      permissions.initFromGraph(aclGraph)
      return permissions
    })
}

module.exports.getPermissions = getPermissions
