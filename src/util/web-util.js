'use strict'
/**
 * Provides misc utility functions for the web client
 * @module web-util
 */
module.exports.composePatchQuery = composePatchQuery
module.exports.parseAllowedMethods = parseAllowedMethods
module.exports.parseLinkHeader = parseLinkHeader
module.exports.absoluteUrl = absoluteUrl
module.exports.hostname = hostname

var graphUtil = require('./graph-util')

/**
 * Extracts the allowed HTTP methods from the 'Allow' and 'Accept-Patch'
 * headers, and returns a hashmap of verbs allowed by the server
 * @method parseAllowedMethods
 * @param allowMethodsHeader {String} `Access-Control-Allow-Methods` response
 *   header
 * @param acceptPatchHeader {String} `Accept-Patch` response header
 * @return {Object} Hashmap of verbs (in lowercase) allowed by the server for
 *   the current user. Example:
 *   ```
 *   {
 *     'get': true,
 *     'put': true
 *   }
 *   ```
 */
function parseAllowedMethods (allowMethodsHeader, acceptPatchHeader) {
  var allowedMethods = {}
  if (allowMethodsHeader) {
    var verbs = allowMethodsHeader.split(',')
    verbs.forEach(function (methodName) {
      if (methodName && allowMethodsHeader.indexOf(methodName) >= 0) {
        allowedMethods[methodName.trim().toLowerCase()] = true
      }
    })
  }
  if (acceptPatchHeader &&
      acceptPatchHeader.indexOf('application/sparql-update') >= 0) {
    allowedMethods.patch = true
  }
  return allowedMethods
}

/**
* Parses a Link header from an XHR HTTP Request.
* @method parseLinkHeader
* @param link {String} Contents of the Link response header
* @return {Object}
*/
function parseLinkHeader (link) {
  if (!link) {
    return {}
  }
  var linkexp = /<[^>]*>\s*(\s*;\s*[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g
  var paramexp = /[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g
  var matches = link.match(linkexp)
  var rels = {}
  for (var i = 0; i < matches.length; i++) {
    var split = matches[i].split('>')
    var href = split[0].substring(1)
    var ps = split[1]
    var s = ps.match(paramexp)

    for (var j = 0; j < s.length; j++) {
      var p = s[j]
      var paramsplit = p.split('=')
      // var name = paramsplit[0]
      var rel = paramsplit[1].replace(/["']/g, '')
      if (!rels[rel]) {
        rels[rel] = []
      }
      rels[rel].push(href)
      if (rels[rel].length > 1) {
        rels[rel].sort()
      }
    }
  }
  return rels
}

function hostname (url) {
  var protocol, hostname, result, pathSegments
  var fragments = url.split('//')
  if (fragments.length === 2) {
    protocol = fragments[0]
    hostname = fragments[1]
  } else {
    hostname = url
  }
  pathSegments = hostname.split('/')
  if (protocol) {
    result = protocol + '//' + pathSegments[0]
  } else {
    result = pathSegments[0]
  }
  if (url.startsWith('//')) {
    result = '//' + result
  }
  return result
}

/**
* Return an absolute URL
* @method absoluteUrl
* @param baseUrl {String} URL to be used as base
* @param pathUrl {String} Absolute or relative URL
* @return {String}
*/
function absoluteUrl (baseUrl, pathUrl) {
  if (pathUrl && pathUrl.slice(0, 4) !== 'http') {
    return [baseUrl, pathUrl].map(function (path) {
      if (path[0] === '/') {
        path = path.slice(1)
      }
      if (path[path.length - 1] === '/') {
        path = path.slice(0, path.length - 1)
      }
      return path
    }).join('/')
  }
  return pathUrl
}

/**
 * Composes and returns a PATCH SPARQL query (for use with `web.patch()`)
 * @method composePatchQuery
 * @param toDel {Array<String|Statement>} List of triples to delete
 * @param toIns {Array<String|Statement>} List of triples to insert
 * @return {String} SPARQL query for use with PATCH
 */
function composePatchQuery (toDel, toIns) {
  var query = ''
  var excludeDot = true
  if (toDel && toDel.length > 0) {
    toDel = toDel.map(function (st) {
      return graphUtil.statementToNT(st, excludeDot)
    })
    query += 'DELETE DATA { ' + toDel.join(' . ') + ' };\n'
  }
  if (toIns && toIns.length > 0) {
    toIns = toIns.map(function (st) {
      return graphUtil.statementToNT(st, excludeDot)
    })
    query += 'INSERT DATA { ' + toIns.join(' . ') + ' };\n'
  }
  return query
}
