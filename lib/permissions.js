'use strict'
/**
 * Provides a Solid web client module to get and set authorization rules for a resource.
 * @module permissions
 */
var PermissionType = {
  Owner: 'Owner',
  Read: 'Read',
  Write: 'Write',
  Append: 'Append'
}

var vocab = require('./vocab')
var rdf = require('./util/rdf-parser').rdflib
var auth = require('./auth')
var webClient = require('./web')

/**
 * Set and Get authorization rules for a resource
 * @class Permissions
 * @static
 */
var Permissions = {
  /**
   * Takes a resource URI and a list of agents & permissions,
   * creates and acl resource corresponding to the given resource URI.
   * @method setPermissions
   * @param url {String} Resource URI to set permissions for
   * @param agents {[String]} List of agent WebIDs to set the permissions for
   * @param permissions {[[PermissionType]]} List
 of permissions
   * @return {Promise(String)} acl resource URI
   */
  setPermissions: function setPermissions (url, agents, permissions) {
    return new Promise(function (resolve, reject) {
      // reading the existing acls from the server and merging them with the new acls for each agent
      mergeAcls(url, agents, permissions).then(
        function (mergedPermissions) {
          // having the merged permissions, create the RDF string representing the auth rules
          // for the list of agents
          var aclString = createAclRules(url, agents, permissions)
          aclString = appendOwnerRule(aclString, url)
          // write the new acl resource via put http method to replace any existing one
          webClient.put(url + ',acl', aclString).then(
            function (meta) {
              // if the acl resource is successfully put on the server, return its url
              resolve(meta.url)
            }
          ).catch(function (err) {
            reject(err)
          })
        }
      )
    })
  },
  /**
  * Retrieves the permissions of a particular resource given its URI for a particular agent
  * @method getPermissions
  * @param url {String} The URI of the resource
  * @return {Promise({PermissionType:[String]})} Object holding each permission type and corresponding agents
  */
  getPermissions: function getPermissions (url) {
    return new Promise(function (resolve, reject) {
      // first, retrieve the url of the acl resource to read the auth rules from
      this.getAclResource(url).then(
        function (aclResource) {
          webClient.getParsedGraph(aclResource).then(
            function (graph) {
              var permissions = {} // this object will contain every agent as key
              // and the corresponding permission ruls as list of values
              var i = 0
              // read the statment containing the auth rules for everyone
              var everyoneStmt = graph.any(undefined, vocab.acl('agentClass'), rdf.sym('<http://xmlns.com/foaf/0.1/Agent>'))

              if (everyoneStmt.length > 0) {
                // retrieve the auth rules assigned to everyone
                var modesSyms = graph.any(everyoneStmt.subject, vocab.acl('mode'), undefined)
                // convert the auth rules from URIs to PermissionTypes
                var modes = this.decodeModes(modesSyms)
                for (i in modes) {
                  var mode = modes[i]
                  addRule(permissions, 'http://xmlns.com/foaf/0.1/Agent', mode)
                }
              }
              // read all the statments having Read auth rule
              var readStmts = graph.any(undefined, vocab.acl('mode'), vocab.acl('Read'))
              // if any existing, retrive the agents having this auth rule assigned
              if (readStmts.length > 0) {
                for (i in readStmts) {
                  var stmt = readStmts[i]
                  var agent = graph.any(stmt.subject, vocab.acl('agent'), undefined)
                  addRule(permissions, agent, PermissionType.Read)
                }
              }
              // read all the statments having Write auth rule
              var writeStmts = graph.any(undefined, vocab.acl('mode'), vocab.acl('Write'))
              // if any existing, retrive the agents having this auth rule assigned
              if (writeStmts.length > 0) {
                for (i in writeStmts) {
                  stmt = writeStmts[i]
                  agent = graph.any(stmt.subject, vocab.acl('agent'), undefined)
                  addRule(permissions, agent, PermissionType.Write)
                }
              }
              // read all the statments having Append auth rule
              var appendStmts = graph.any(undefined, vocab.acl('mode'), vocab.acl('Append'))
              // if any existing, retrive the agents having this auth rule assigned
              if (appendStmts.length > 0) {
                for (i in appendStmts) {
                  stmt = appendStmts[i]
                  agent = graph.any(stmt.subject, vocab.acl('agent'), undefined)
                  addRule(permissions, agent, PermissionType.Append)
                }
              }
              // successfully retrieved the resource permissions. return the permissions object
              resolve(permissions)
            }
          ).catch(
            function (err) {
              reject(err)
            }
          )
        }
      ).catch(
        function (err) {
          reject(err)
        }
      )
    })
  },
  /**
  * Given a resource url, retrieve the url of the corresponding acl resource
  * @method getAclResource
  * @param url {String} The url of the resource to retrieve the acl resource url for
  * @return {Promise(String)} The url of the acl resource
  */
  getAclResource: function getAclResource (url) {
    return new Promise(function (resolve, reject) {
      webClient.head(url).then(
        function (solidResponse) {
          // if the resource exists and there is a logged in user, then succeed with the acl url
          if (solidResponse.exists() && solidResponse.isLoggedIn()) {
            resolve(solidResponse.acl)
          } else {
            // if not, fail with the status code
            reject(solidResponse.xhr.status)
          }
        }
      ).catch(function (error) {
        reject(error)
      })
    })
  },
  /**
  * Check the permissions for the resource is inherited from its parent container or it has its own permissions
  * @method isPermissionsInherited
  * @param url {String} the url of the resource
  * @return {Promise(bool)} true if inherited and false if has its own permissions
  */
  isPermissionsInherited: function isPermissionsInherited (url) {
    var that = this

    return new Promise(function (resolve, reject) {
      that.getAclResource(url).then(
        function (aclUrl) {
          // if the acl resource is the same as the reource url appending ",acl",
          // then the resource doesn't inherite the acl rules from its parent container.
          if ((url + ',acl') === aclUrl) {
            resolve(false)
          } else {
            resolve(true)
          }
        }
      ).catch(function (err) {
        reject(err)
      })
    })
  }
}

/**
* Given a list of modes URIs, get a list of PermissionType
* @method decodeModes
* @param modes {[String]} list of auth URIs
* @return {[PermissionType]}
*/
function decodeModes (modes) {
  var decodedModes = []

  for (var i in modes) {
    var mode = modes[i]
    var modeString = mode.value.substring(mode.value.indexOf('#') + 1, mode.value.length)
    if (modeString === 'Control') {
      decodedModes.append('Owner')
    } else {
      decodedModes.append(modeString)
    }
  }

  return decodedModes
}

/**
* Given a list of PermissionTypes, get a list of auth URIs
* @method encodeModes
* @param modes {[PermissionType]} list of PermissionTypes
* @return {[String]}
*/
function encodeModes (modes) {
  var encodedModes = []

  for (var i in modes) {
    var mode = modes[i]
    if (mode === 'Owner') {
      encodedModes.append(vocab.acl('Control'))
    } else {
      encodedModes.append(vocab.acl(mode))
    }
  }

  return encodedModes
}

/**
* Private method. Add authorization rule to the returned object
* @method addRule
* @param obj {{PermissionType:[String]}}
* @param agents {[String]} List of agents to add permission for
* @param mode {PermissionType}
* @return {{PermissionType:[String]}}
*/
function addRule (obj, agents, mode) {
  if (!obj[mode]) {
    obj[mode] = []
  }

  obj[mode].append(agents)

  return obj
}

function getPermissionsObjectByAgentKey (permissionsObjectByModeKey) {
  var newObj = {}

  for (var mode in permissionsObjectByModeKey) {
    var modeAgents = permissionsObjectByModeKey[mode]

    if (modeAgents) {
      for (var i in modeAgents) {
        var agent = modeAgents[i]

        if (!newObj[agent]) {
          newObj[agent] = []
        }

        newObj[agent].append(mode)
      }
    }
  }

  return newObj
}

function getPermissionsObjectByModeKey (permissionsObjectByAgentKey) {
  var newObj = {}

  for (var agent in permissionsObjectByAgentKey) {
    var agentModes = permissionsObjectByAgentKey[agent]

    if (agentModes) {
      for (var i in agentModes) {
        var mode = agentModes[i]

        if (!newObj[mode]) {
          newObj[mode] = []
        }

        newObj[mode].append(agent)
      }
    }
  }

  return newObj
}

/**
* Private method. Merging the new permissions fed in parameters with current permissions read from the server
* @method mergeAcls
* @param url {String} The URI of the resource to update its permissions
* @param agents [String] List of WebIDs of agents to add/modify their permissions on this resrouce
* @param modes [[PermissionType]] List of List of PermissionTypes corresponding to the list of agents
* @return {{String}:[PermissionType]} return object with keys agents' WebIDs and values list of granted permissions
*/
function mergeAcls (url, agents, modes) {
  return new Promise(function (resolve, reject) {
    // first retrive the currently granted permissions to merge with the new passed permissions
    Permissions.getPermissions(url).then(
      function (permObj) {
        // if successfully retrieved, restructure the object to have agents' WebID as the keys
        var mergedPermissions = getPermissionsObjectByAgentKey(permObj)
        // finally loop over agents and merge the permissions
        for (var i in agents) {
          var agent = agents[i]
          var agentModes = modes[i]

          if (agentModes) {
            if (!mergedPermissions[agent]) {
              mergedPermissions[agent] = []
            }
            // remove any duplicates after merging
            mergedPermissions[agent] = removeArrayDuplicates(mergedPermissions[agent].append(agentModes))
          }
        }

        resolve(mergedPermissions)
      }
    ).catch(function (err) {
      // if failed to retrieve the existing acl rules, the whole process fails
      // it's not safe to update the acl resource with partial permissions.
      reject(err)
    })
  })
}

// Utility function to remove duplicates in an array
function removeArrayDuplicates (array) {
  var obj = {}
  for (var i = 0; i < array.length; i++) {
    obj[array[i]] = true
  }

  var arr = []
  for (var key in obj) {
    arr.push(key)
  }

  return arr
}

/**
* Create acl rules as RDF string to be written to the acl resource
* @method createAclRules
* @param url {String} URI of the resource to change acls
* @param permissions {String: [PermissionType]} Permission object having WebIDs as keys and value as list of PermissionTypes
* @return {String} RDF string representing the acl rules
*/
function createAclRules (url, permissions) {
  var aclString = ''

  for (var agent in permissions) {
    var agentPermissions = permissions[agent]
    var timestamp = Date.now() + ''
    // The everyone rules is a special case. It has acl:agentClass predicate instead of acl:agent
    if (agent.indexOf('http://xmlns.com/foaf/0.1/Agent') >= 0) {
      aclString += '<#policy' + timestamp + '> a <http://www.w3.org/ns/auth/acl#Authorization>;\n' +
        '<http://www.w3.org/ns/auth/acl#accessTo> <' + url + '>;\n' +
        '<http://www.w3.org/ns/auth/acl#agentClass> <' + agent + '>;\n' +
        '<http://www.w3.org/ns/auth/acl#mode> '

      aclString += appendPermissions(aclString, agentPermissions)
    } else {
      // The normal acl rules for any agent
      aclString += '<#policy' + timestamp + '> a <http://www.w3.org/ns/auth/acl#Authorization>;\n' +
        '<http://www.w3.org/ns/auth/acl#accessTo> <' + url + '>;\n' +
        '<http://www.w3.org/ns/auth/acl#agent> <' + agent + '>;\n' +
        '<http://www.w3.org/ns/auth/acl#mode> '

      aclString += appendPermissions(aclString, agentPermissions)
    }
  }

  return aclString
}

// Private method to append the acl modes to the acl RDF string
function appendPermissions (aclString, rules) {
  var agentPermissions = encodeModes(rules)
  for (var j = 0; j < agentPermissions.length - 1; j++) {
    var permission = agentPermissions[j]
    aclString += '<' + permission + '>,'
  }
  aclString += '<' + agentPermissions[agentPermissions.length - 1] + '>.\n\n'

  return aclString
}

// Private method to append the owner acl rule to the acl RDF string
function appendOwnerRule (url, aclString) {
  var currentUser = auth.currentUser()

  if (currentUser) {
    var string = '<#policy0> a <http://www.w3.org/ns/auth/acl#Authorization>;\n' +
      '<http://www.w3.org/ns/auth/acl#accessTo> <' + url + '>;\n' +
      '<http://www.w3.org/ns/auth/acl#agent> <' + currentUser + '>;\n' +
      '<http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Control>, <http://www.w3.org/ns/auth/acl#Read>, <http://www.w3.org/ns/auth/acl#Write>.\n\n'
    return string + aclString
  } else {
    return ''
  }
}

module.exports.getPermissions = Permissions.getPermissions
module.exports.setPermissions = Permissions.setPermissions
module.exports.getAclResource = Permissions.getAclResource
module.exports = Permissions
