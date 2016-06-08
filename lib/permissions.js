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

// Represents an Agent object to distinguish individual agents vs user groups
function Agent (agentURI, isSingular) {
  this.uri = agentURI || ''
  this.isSingular = isSingular
}

Agent.prototype.isEqual = function (agent) {
  return this.uri === agent.uri
}

// Authorization object encapsultes Agent + Permissions + Resource + isDefault
function Authorization (agent, url, isDefault) {
  this.agent = agent
  this.resourceUrl = url
  this.isDefaultForNew = isDefault
}

Authorization.prototype.hash = function () {
  return md5(this.agent.uri + '-' + this.isDefaultForNew)
}

Authorization.prototype.isEqual = function (agent) {
  return this.hash() === agent.hash()
}

Authorization.prototype.isValid = function () {
  return this.agent &&
    this.resourceUrl &&
    this.permissions
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
   * @param agents {Array<Authorizations>} List of Agents to set the permissions
   * @param replaceExisting {Boolean} whether to extend or override existing
   *   permissions
   * @return {Promise<String>} acl resource URI
   */
  setPermissions: function setPermissions (url, authorizations,
                                           replaceExisting) {
    return Promise.resolve().then(function () {
      if (replaceExisting) {
        // override any existing acl resource
        // first create the permissions object mapping webids to
        // permission list
        var permissionsObject = {}

        for (var i in authorizations) {
          var authorization = authorizations[i]
          permissionsObject[authorization.hash()] = Authorization
        }

        return createAclResource(url, permissionsObject)
      } else {
        // in case the user explicitly asks to extend the existing
        // permissions, then reading the existing acls from the server and
        // merging them with the new acls for each agent
        return mergeAcls(url, authorizations)
          .then(function (mergedPermissions) {
            return createAclResource(url, mergedPermissions)
          })
      }
    })
  },
  /**
   * Retrieves the permissions of a particular resource given its URI for a
   * particular agent. Example permissions structure:
   *
   *   ```
   *   {
   *     'Control': [ Authorization1 ],
   *     'Read': [ Authorization2, Authorization3 ]
   *   }
   *   ```
   * @method getPermissions
   * @param url {String} The URI of the resource
   * @return {Promise<Object>} Object holding each permission
   *   type and corresponding Authorizations
   */
  getPermissions: function getPermissions (url) {
    var self = this

    // first, retrieve the url of the acl resource to read the auth rules from
    return self.getAclResource(url)
      .then(function (aclResource) {
        return webClient.get(aclResource)
      })
      .then(function (response) {
        // You can parse it using RDFLib.js, etc:
        var graph = rdf.graph()
        rdf.parse(response.raw(), graph, response.url, response.contentType())
        // this object will contain every agent as key
        var permissions = {}
        // and the corresponding permission rules as list of values
        var i = 0

        // read all the statements having Read auth rule
        var readStmts = graph.statementsMatching(undefined, vocab.acl('mode'),
          vocab.acl('Read'))
        // if any existing, retrieve the agents having this auth rule
        // assigned
        if (readStmts && readStmts.length > 0) {
          for (i in readStmts) {
            var stmt = readStmts[i]
            var authorization = getAuthorization(url, graph, stmt)
            addRule(permissions, authorization, PermissionType.Read)
          }
        }

        // read all the statements having Write auth rule
        var writeStmts = graph.statementsMatching(undefined, vocab.acl('mode'),
          vocab.acl('Write'))
        // if any existing, retrieve the agents having this auth rule
        // assigned
        if (writeStmts && writeStmts.length > 0) {
          for (i in writeStmts) {
            stmt = writeStmts[i]
            authorization = getAuthorization(url, graph, stmt)
            addRule(permissions, authorization, PermissionType.Write)
          }
        }

        // read all the statements having Append auth rule
        var appendStmts = graph.statementsMatching(undefined, vocab.acl('mode'),
          vocab.acl('Append'))
        // if any existing, retrieve the agents having this auth rule
        // assigned
        if (appendStmts && appendStmts.length > 0) {
          for (i in appendStmts) {
            stmt = appendStmts[i]
            authorization = getAuthorization(url, graph, stmt)
            addRule(permissions, authorization, PermissionType.Append)
          }
        }

        // read all the statements having Control auth rule
        var controlStmts = graph.statementsMatching(undefined,
          vocab.acl('mode'), vocab.acl('Control'))
        // if any existing, retrieve the agents having this auth rule
        // assigned
        if (controlStmts && controlStmts.length > 0) {
          for (i in controlStmts) {
            stmt = controlStmts[i]
            authorization = getAuthorization(url, graph, stmt)
            addRule(permissions, authorization, PermissionType.Control)
          }
        }
        // successfully retrieved the resource permissions. return the
        // permissions object
        return permissions
      })
  },
  /**
   * Given a resource url, get the url of the individual acl resource
   * corresponding to this resource
   * @method getAclResource
   * @param url {String} The url of the resource to retrieve the acl resource
   *   url for
   * @return {Promise<String>} The url of the acl resource corresponding to this
   *   resource
   */
  getAclResource: function getAclResource (url) {
    return webClient.head(url)
      .then(function (solidResponse) {
        // if the resource exists and there is a logged in user, then
        // succeed with the acl url
        if (solidResponse.exists()) {
          return solidResponse.acl
        } else {
          // if not, fail with the status code
          return solidResponse.xhr.status
        }
      })
  },
  /**
   * Check the permissions for the resource is inherited from its parent
   * container or it has its own permissions ***NOT IMPLEMENTED***
   * @method isPermissionsInherited
   * @param url {String} the url of the resource
   * @return {Promise<Boolean>} true if inherited and false if has its own
   *   permissions
   */
  isPermissionsInherited: function isPermissionsInherited (url) {
    return this.getAclResource(url)
  },

  agent: Agent,
  authorization: Authorization
}

/**
 * Writes a dedicated acl resource for the given resource
 * @method createAclResource
 * @param url {String} the url of the resource
 * @param permissions {Object} Hashmap of PermissionType
 *   lists, keyed by authorization hash.
 * @return {Promise<String>} the url of the created acl resource in case of
 *   success or the error object in case of failure
 */
function createAclResource (url, permissions) {
  // write the new acl resource via put http method to replace any
  // existing one
  return Permissions.getAclResource(url)
    .then(function (aclUrl) {
      // having the permissions, create the RDF string representing
      // the auth rules for the list of agents
      var aclString = createAclRules(url, aclUrl, permissions)

      return webClient.put(aclUrl, aclString)
        .then(function (response) {
          // if the acl resource is successfully put on the server, return
          // its url
          return response.url
        })
    })
}

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
 * @param authorizations {Array<Authorization>} List of agents to add permission
 * @param mode {String} Permission mode, see `PermissionType` for valid values.
 * @return {Object} Modified hashmap, see `getPermissions()`
 *   docstring for sample structure.
 */
function addRule (obj, authorizations, mode) {
  if (!obj[mode]) {
    obj[mode] = []
  }

  obj[mode].push(authorizations)

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

  return agent
}

function getAuthorization (url, graph, stmt) {
  var agentObj = getAgent(graph, stmt)

  // retrieve whether this authorization passes to decendents
  var isDefault = graph.any(stmt.subject, vocab.acl(inheritancePredicateName), undefined)

  if (isDefault) {
    isDefault = true
  }

  return new Authorization(agentObj, url, isDefault)
}

function getPermissionsObjectByAuthKey (permissionsModeKey) {
  var permissionsAgentKey = {}

  for (var mode in permissionsModeKey) {
    var authorizations = permissionsModeKey[mode]

    for (var i in authorizations) {
      var authorization = authorizations[i]

      var sameAuth = permissionsAgentKey[authorization.hash()]
      if (sameAuth) {
        sameAuth.permissions.push(mode)
      } else {
        authorization.permissions = []
        authorization.permissions.push(mode)
        permissionsAgentKey[authorization.hash()] = authorization
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
 * @param authorizations {Array<Authorization>} List of WebIDs of agents to
 * add/modify their  permissions on this resource
 * @return {Object} Hashmap of PermissionType lists, keyed by
 *   autorization hash.
 */
function mergeAcls (url, authorizations) {
  // first retrieve the currently granted permissions to merge with the new
  // passed permissions
  return Permissions.getPermissions(url)
    .then(function (permObj) {
      // if successfully retrieved, restructure the object to have agents'
      // WebID as the keys
      var mergedPermissions = getPermissionsObjectByAuthKey(permObj)
      // finally loop over agents and merge the permissions
      for (var i in authorizations) {
        var authorization = authorizations[i]

        if (authorization.isValid()) {
          mergedPermissions[authorization.hash()] = authorization
        }
      }
      return mergedPermissions
    })
    .catch(function (err) {
      // if failed to retrieve the existing acl rules, create acl resource
      // with the new submitted agents and permissions
      var permissions = {}

      for (var i in authorizations) {
        var authorization = authorizations[i]
        permissions[authorization.hash()] = authorization
      }
      console.log(err)
      Promise.resolve(permissions)
    })
}

/**
 * Create acl rules as RDF string to be written to the acl resource
 * @method createAclRules
 * @param url {String} URI of the resource to change acls
 * @param permissions {Object} Hashmap of PermissionType
 *   lists, keyed by authorization hash.
 * @return {String} RDF string representing the acl rules
 */
function createAclRules (url, aclUrl, permissions) {
  var aclString = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\n'

  for (var authHash in permissions) {
    var authorization = permissions[authHash]
    var timestamp = Date.now() + ''
    // The everyone rules is a special case. It has acl:agentClass predicate
    // instead of acl:agent
    // var relativePath = path.relative(aclUrl, url)
    var relativePath = path.basename(url)

    aclString += '<#policy' + timestamp +
      '> a <http://www.w3.org/ns/auth/acl#Authorization>;\n' +
      '<http://www.w3.org/ns/auth/acl#accessTo> <' + relativePath + '>;\n'

    if (authorization.isDefaultForNew) {
      aclString += '<http://www.w3.org/ns/auth/acl#' +
        inheritancePredicateName + '> <>;\n'
    }

    if (!authorization.isSingular) {
      aclString += '<http://www.w3.org/ns/auth/acl#agentClass> <' + authorization.resourceUrl +
        '>;\n' + '<http://www.w3.org/ns/auth/acl#mode> '
      aclString += appendPermissions(authorization.permissions)
    } else {
      // The normal acl rules for any agent
      aclString += '<http://www.w3.org/ns/auth/acl#agent> <' + authorization.resourceUrl +
        '>;\n' + '<http://www.w3.org/ns/auth/acl#mode> '

      aclString += appendPermissions(authorization.permissions)
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
module.exports.getAclResource = Permissions.getAclResource
module.exports = Permissions
