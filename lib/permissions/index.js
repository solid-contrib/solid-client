'use strict'
/**
 * @module permissions
 */

var PermissionSet = require('./permission-set')
var webClient = require('../web')

/**
 * Clears (deletes) an ACL resource for a given resource url.
 * Usage:
 *
 *   ```
 *   solid.clearPermissions('https://alice.example.com/docs/file1')
 *     .then(function (result) {
 *       // Now the ACL resource at file1.acl is deleted
 *     })
 *   ```
 * @method clearPermissions
 * @param resourceUrl {String} URL of a resource (not its ACL)
 * @return {Promise<PermissionSet>}
 */
function clearPermissions (resourceUrl) {
  var aclResourceUrl
  return webClient.head(resourceUrl)
    .then(function (response) {
      aclResourceUrl = response.aclAbsoluteUrl()
      if (!aclResourceUrl) {
        throw new Error('ACL URL not found for resource.')
      }
      return webClient.del(aclResourceUrl)
    })
}

/**
 * Fetches and returns a PermissionSet initialized from an ACL resource.
 * Usage:
 *
 *   ```
 *   solid.getPermissions('https://alice.example.com/docs/file1')
 *     .then(function (permissionSet) {
 *       // loads the PermissionSet instance, parsed from file1.acl for example
 *       // now you can edit it and save it
 *       return permissionSet
 *         .addPermission(aliceWebId, [solid.acl.READ, solid.acl.WRITE])
 *         .addPermission(aliceWebId, solid.acl.CONTROL)
 *         .addPermission(solid.acl.EVERYONE, solid.acl.READ)
 *         .save()
 *     })
 *   ```
 * @method getPermissions
 * @param resourceUrl {String} URL of a resource (not its ACL)
 * @return {Promise<PermissionSet>}
 */
function getPermissions (resourceUrl) {
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

module.exports.clearPermissions = clearPermissions
module.exports.getPermissions = getPermissions
