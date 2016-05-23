'use strict'
/**
 * Provides a Solid web client module to get and set authorization rules for
 * a resource.
 * @module permissions
 */

var vocab = require('./vocab')
var rdf = require('./util/rdf-parser').rdflib
var webClient = require('./web')
var path = require('path')
var md5 = require('md5')

var inheritancePredicateName = 'defaultForNew'

var PermissionType = {
  Control: 'Control',
  Read: 'Read',
  Write: 'Write',
  Append: 'Append'
}

// Represents an Agent object to distinguish singular agents vs user groups
function Agent (agentURI, isSingular) {
  this.uri = agentURI || ''
  this.isSingular = typeof isSingular !== 'undefined' ? isSingular : true
  this.isDefaultForNew = false
}

Agent.prototype.hash = function () {
  return md5(this.uri + '-' + this.isDefaultForNew)
}

Agent.prototype.isEqual = function (agent) {
  return this.hash() === agent.hash()
}

// var everyoneAgent = new Agent('http://xmlns.com/foaf/0.1/Agent', false)

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
   * @param agents {Array<Agent>} List of Agents to set the permissions
   * for
   * @param permissions {Array<Array<String>>} Lists of permission types
   *   (see `PermissionType` for valid values).
   * @param replaceExisting {Boolean} whether to extend or override existing
   * permissions
   * @return {Promise<String>} acl resource URI
   */
  setPermissions: function setPermissions (url, agents, permissions, replaceExisting) {
    return new Promise(function (resolve, reject) {
      if (replaceExisting) {
        // override any existing acl resource
        // first create the permissions object mapping webids to
        // permission list
        var permissionsObject = {}

        for (var i in agents) {
          var agent = agents[i]
          agent.permissions = permissions[i]
          //   var agentPermissions = permissions[i]
          permissionsObject[agent.hash()] = agent
        }

        createAclResource(url, permissionsObject).then(
          function (url) {
            resolve(url)
          }
        ).catch(function (err) {
          reject(err)
        })
      } else {
        // in case the user explicitly asks to extend the existing
        // permissions, then reading the existing acls from the server and
        // merging them with the new acls for each agent
        mergeAcls(url, agents, permissions).then(
          function (mergedPermissions) {
            createAclResource(url, mergedPermissions).then(
              function (url) {
                resolve(url)
              }
            ).catch(function (err) {
              reject(err)
            })
          }
        )
      }
    })
  },
  /**
   * Retrieves the permissions of a particular resource given its URI for a
   * particular agent. Example permissions structure:
   *
   *   ```
   *   {
   *     'Control': [ 'agentUri1' ],
   *     'Read': [ 'agentUri2', 'agentUri3' ]
   *   }
   *   ```
   * @method getPermissions
   * @param url {String} The URI of the resource
   * @return {Promise<Object>} Object holding each permission
   *   type and corresponding agents
   */
  getPermissions: function getPermissions (url) {
    var self = this

    return new Promise(function (resolve, reject) {
      // first, retrieve the url of the acl resource to read the auth rules from
      self.getDedicatedAclResource(url).then(
        function (aclResource) {
          webClient.get(aclResource).then(
            function (response) {
              // You can parse it using RDFLib.js, etc:
              var graph = rdf.graph()
              rdf.parse(response.raw(), graph, response.url, response.contentType())
              // this object will contain every agent as key
              var permissions = {}
              // and the corresponding permission rules as list of values
              var i = 0

              // read all the statements having Read auth rule
              var readStmts = graph.statementsMatching(undefined, vocab.acl('mode'), vocab.acl('Read'))
              // if any existing, retrieve the agents having this auth rule
              // assigned
              if (readStmts && readStmts.length > 0) {
                for (i in readStmts) {
                  var stmt = readStmts[i]
                  var agent = getAgent(graph, stmt)
                  addRule(permissions, agent, PermissionType.Read)
                }
              }

              // read all the statements having Write auth rule
              var writeStmts = graph.statementsMatching(undefined, vocab.acl('mode'), vocab.acl('Write'))
              // if any existing, retrieve the agents having this auth rule
              // assigned
              if (writeStmts && writeStmts.length > 0) {
                for (i in writeStmts) {
                  stmt = writeStmts[i]
                  agent = getAgent(graph, stmt)
                  addRule(permissions, agent, PermissionType.Write)
                }
              }

              // read all the statements having Append auth rule
              var appendStmts = graph.statementsMatching(undefined, vocab.acl('mode'), vocab.acl('Append'))
              // if any existing, retrieve the agents having this auth rule
              // assigned
              if (appendStmts && appendStmts.length > 0) {
                for (i in appendStmts) {
                  stmt = appendStmts[i]
                  agent = getAgent(graph, stmt)
                  addRule(permissions, agent, PermissionType.Append)
                }
              }

              // read all the statements having Control auth rule
              var controlStmts = graph.statementsMatching(undefined, vocab.acl('mode'), vocab.acl('Control'))
              // if any existing, retrieve the agents having this auth rule
              // assigned
              if (controlStmts && controlStmts.length > 0) {
                for (i in controlStmts) {
                  stmt = controlStmts[i]
                  agent = getAgent(graph, stmt)
                  addRule(permissions, agent, PermissionType.Control)
                }
              }

              // successfully retrieved the resource permissions. return the
              // permissions object
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
   * Given a resource url, retrieve the url of the acl resource that has the
   * permission rules for this resource. Note that the retrieved url may be the
   * url of an ancestor of the resource.
   * @method getAclResource
   * @param url {String} The url of the resource to retrieve the acl resource
   * url for
   * @return {Promise<String>} The url of the acl resource
   */
  getAclResource: function getAclResource (url) {
    var self = this

    return new Promise(function (resolve, reject) {
      webClient.head(url).then(
        function (solidResponse) {
          var aclUrl
          // if the resource exists and there is a logged in user, then
          // succeed with the acl url
          if (solidResponse.exists() && solidResponse.isLoggedIn()) {
            aclUrl = solidResponse.acl
          }

          resolve(aclUrl)
        }
      ).then(function (aclUrl) {
        if (aclUrl) {
          // if not, retrieve the acl resource for its parent container
          // chaining up to the root
          // first get the parent container url
          var parentUrl = url.split('/').pop().merge('/')
          // then recursively go up to the parent retrieving the first
          // existing acl resource
          return self.getAclResource(parentUrl)
        }

        return aclUrl
      })
    })
  },
  /**
   * Given a resource url, for the acl resource url that should be
   * corresponding to this resource regardless it exists or not
   * @method getDedicatedAclResource
   * @param url {String} The url of the resource to retrieve the acl resource
   * url for
   * @return {Promise<String>} The url of the acl resource corresponding to this
   * resource
   */
  getDedicatedAclResource: function getDedicatedAclResource (url) {
    return webClient.head(url).then(
      function (solidResponse) {
        // if the resource exists and there is a logged in user, then
        // succeed with the acl url
        if (solidResponse.exists()) {
          return solidResponse.acl
        } else {
          // if not, fail with the status code
          return solidResponse.xhr.status
        }
      }
    ).catch(function (error) {
      return error
    })
  },
  /**
   * Check the permissions for the resource is inherited from its parent
   * container or it has its own permissions
   * @method isPermissionsInherited
   * @param url {String} the url of the resource
   * @return {Promise<Boolean>} true if inherited and false if has its own
   *   permissions
   */
  isPermissionsInherited: function isPermissionsInherited (url) {
    var self = this

    return new Promise(function (resolve, reject) {
      self.getDedicatedAclResource(url).then(
        function (aclUrl) {
          // if succeeded and the acl resource retrieved, then there's an individula acl resource
          resolve(true)
        }
      ).catch(function () {
        resolve(false)
      })
    })
  },
  agent: Agent
}

/**
* Writes a dedicated acl resource for the given resource
* @method createAclResource
* @param url {String} the url of the resource
* @param permissions {Object} Hashmap of PermissionType
*   lists, keyed by agent WebID.
* @return {Promise<String>} the url of the created acl resource in case of
* success or the error object in case of failure
*/
function createAclResource (url, permissions) {
  return new Promise(function (resolve, reject) {
    // write the new acl resource via put http method to replace any
    // existing one
    Permissions.getDedicatedAclResource(url).then(
      function (aclUrl) {
        // having the permissions, create the RDF string representing
        // the auth rules for the list of agents
        var aclString = createAclRules(url, aclUrl, permissions)
        console.log(aclString)
        webClient.put(aclUrl, aclString).then(
          function (meta) {
            // if the acl resource is successfully put on the server, return
            // its url
            resolve(meta.url)
          }
        ).catch(function (err) {
          reject(err)
        })
      }
    ).catch(function (err) {
      reject(err)
    })
  })
}

/**
 * Given a list of modes URIs, get a list of PermissionType
 * @method decodeModes
 * @param modes {Array<String>} list of auth URIs
 * @return {Array<PermissionType>}
 */
// function decodeModes (modes) {
//   var decodedModes = []
//
//   for (var i in modes) {
//     var mode = modes[i]
//     var modeUri = mode.object.uri
//     var modeString = modeUri.substring(modeUri.indexOf('#') + 1, modeUri.length)
//     decodedModes.push(modeString)
//   }
//
//   return decodedModes
// }

/**
 * Given a list of PermissionTypes, returns a list of auth URIs
 * @method encodeModes
 * @param modes {Array<PermissionType>} list of PermissionTypes
 * @return {Array<String>}
 */
function encodeModes (modes) {
  var encodedModes = []

  for (var i in modes) {
    var mode = modes[i]
    encodedModes.push(vocab.acl(mode))
  }

  return encodedModes
}

/**
 * Private method. Add authorization rule to the returned object
 * @method addRule
 * @param obj {Object} Hashmap of permission types, PermissionType: [String]
 * @param agents {Array<String>} List of agents to add permission for
 * @param mode {String} Permission mode, see `PermissionType` for valid values.
 * @return {Object} Modified hashmap, see `getPermissions()`
 *   docstring for sample structure.
 */
function addRule (obj, agents, mode) {
  if (!obj[mode]) {
    obj[mode] = []
  }

  obj[mode].push(agents)

  return obj
}

function getAgent (graph, stmt) {
  var agent = graph.any(stmt.subject, vocab.acl('agent'), undefined)
  var agentClass = graph.any(stmt.subject, vocab.acl('agentClass'), undefined)

  if (agent) {
    agent = new Agent(agent.uri, true)
  } else {
    agent = new Agent(agentClass.uri, false)
  }

  // retrieve whether this authorization passes to decendents
  var isDefault = graph.any(stmt.subject, vocab.acl(inheritancePredicateName), undefined)

  if (isDefault) {
    agent.isDefaultForNew = true
  }

  return agent
}

function getPermissionsObjectByAgentKey (permissionsModeKey) {
  var permissionsAgentKey = {}

  for (var mode in permissionsModeKey) {
    var agents = permissionsModeKey[mode]

    for (var i in agents) {
      var agent = agents[i]

      var sameAgent = permissionsAgentKey[agent.hash()]
      if (sameAgent) {
        sameAgent.permissions.push(mode)
      } else {
        agent.permissions = []
        agent.permissions.push(mode)
        permissionsAgentKey[agent.hash()] = agent
      }
    }
  }

  return permissionsAgentKey
}

/**
 * Merges the new permissions fed in parameters with current permissions read
 * from the server
 * @method mergeAcls
 * @private
 * @param url {String} The URI of the resource to update its permissions
 * @param agents {Array<String>} List of WebIDs of agents to add/modify their
 *   permissions on this resource
 * @param modes {Array<Array<String>>} List of List of PermissionTypes
 *   corresponding to the list of agents
 * @return {Object} Hashmap of PermissionType lists, keyed by
 *   agent WebID.
 */
function mergeAcls (url, agents, modes) {
  return new Promise(function (resolve, reject) {
    // first retrieve the currently granted permissions to merge with the new
    // passed permissions
    Permissions.getPermissions(url).then(
      function (permObj) {
        // if successfully retrieved, restructure the object to have agents'
        // WebID as the keys
        var mergedPermissions = getPermissionsObjectByAgentKey(permObj)
        // finally loop over agents and merge the permissions
        for (var i in agents) {
          var agent = agents[i]
          var agentModes = modes[i]
          agent.permissions = modes[i]

          if (agentModes) {
            mergedPermissions[agent.hash()] = agent
          }
        }

        resolve(mergedPermissions)
      }
    ).catch(function (err) {
      // if failed to retrieve the existing acl rules, create acl resource
      // with the new submitted agents and permissions
      var permissions = {}

      for (var i in agents) {
        var agent = agents[i]
        agent.permissions = modes[i]
        permissions[agent.hash()] = agent
      }
      resolve(permissions)
      console.log(err)
    })
  })
}

/**
 * Create acl rules as RDF string to be written to the acl resource
 * @method createAclRules
 * @param url {String} URI of the resource to change acls
 * @param permissions {Object} Hashmap of PermissionType
 *   lists, keyed by agent WebID.
 * @return {String} RDF string representing the acl rules
 */
function createAclRules (url, aclUrl, permissions) {
  var aclString = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\n'

  for (var agentHash in permissions) {
    var agent = permissions[agentHash]
    var timestamp = Date.now() + ''
    // The everyone rules is a special case. It has acl:agentClass predicate
    // instead of acl:agent
    // var relativePath = path.relative(aclUrl, url)
    var relativePath = path.basename(url)

    aclString += '<#policy' + timestamp + '> a <http://www.w3.org/ns/auth/acl#Authorization>;\n' +
      '<http://www.w3.org/ns/auth/acl#accessTo> <' + relativePath + '>;\n'

    if (agent.isDefaultForNew) {
      aclString += '<http://www.w3.org/ns/auth/acl#' + inheritancePredicateName + '> <>;\n'
    }

    if (!agent.isSingular) {
      aclString += '<http://www.w3.org/ns/auth/acl#agentClass> <' + agent.uri + '>;\n' +
        '<http://www.w3.org/ns/auth/acl#mode> '

      aclString += appendPermissions(agent.permissions)
    } else {
      // The normal acl rules for any agent
      aclString += '<http://www.w3.org/ns/auth/acl#agent> <' + agent.uri + '>;\n' +
        '<http://www.w3.org/ns/auth/acl#mode> '

      aclString += appendPermissions(agent.permissions)
    }
  }

  return aclString
}

// Private method to append the acl modes to the acl RDF string
function appendPermissions (modes) {
  var aclString = ''
  var agentPermissions = encodeModes(modes)
  for (var j = 0; j < agentPermissions.length - 1; j++) {
    var permission = agentPermissions[j]
    aclString += permission + ', '
  }
  aclString += agentPermissions[agentPermissions.length - 1] + '.\n\n'

  return aclString
}

/**
 * Create acl rules as RDF string to be written to the acl resource
 * @method createAclRules
 * @param url {String} URI of the resource to change acls
 * @param permissions {Object} Hashmap of PermissionType
 *   lists, keyed by ACL mode.
 * @return {String} RDF string representing the acl rules
 */
/*
function createCompactAclRules (url, permissions) {
  var aclString = ''

  for (var mode in permissions) {
    var agents = permissions[mode]
    var timestamp = Date.now() + ''

    aclString += '<#authorization' + timestamp + '> a <http://www.w3.org/ns/auth/acl#Authorization>;\n' +
      '<http://www.w3.org/ns/auth/acl#accessTo> <' + url + '>;\n' +
      '<http://www.w3.org/ns/auth/acl#mode> <' + mode + '>;\n'

    aclString += appendAgents(agents)
  }

  return aclString
}

// Private method to append the acl agents to the acl RDF string
function appendAgents (agents) {
  var agentClassList = []
  var agentList = []
  for (var j = 0; j < agents.length - 1; j++) {
    var agent = agents[j]
    if (agent.isSingular) {
      agentList.push(agent)
    } else {
      agentClassList.push(agent)
    }
  }

  var aclString = ''

  if (agentList.length > 0) {
    aclString = '<http://www.w3.org/ns/auth/acl#agent> '

    for (j = 0; j < agentList.length - 1; j++) {
      agent = agentList[j]
      aclString += '<' + agent + '>, '
    }
    aclString += '<' + agentList[agentList.length - 1] + '>;\n'
  }

  var aclStringEveryone = ''

  if (agentClassList.length > 0) {
    aclStringEveryone = '<http://www.w3.org/ns/auth/acl#agentClass> '
    for (j = 0; j < agentClassList.length - 1; j++) {
      agent = agentClassList[j]
      aclStringEveryone += '<' + agent + '>, '
    }
    aclString += '<' + agentClassList[agentClassList.length - 1] + '>;\n'
  }

  aclString = aclString + aclStringEveryone + '.\n\n'

  return aclString
}
*/

module.exports.getPermissions = Permissions.getPermissions
module.exports.setPermissions = Permissions.setPermissions
module.exports.getAclResource = Permissions.getAclResource
module.exports.getDedicatedAclResource = Permissions.getDedicatedAclResource
module.exports = Permissions
