'use strict'
/**
 * Provides misc utility functions for the web client
 * @module web-util
 */
module.exports.composePatchQuery = composePatchQuery
module.exports.parseAllowedMethods = parseAllowedMethods
module.exports.parseLinkHeader = parseLinkHeader
module.exports.absoluteUrl = absoluteUrl

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

/**
* Return an absolute URL
* @method absoluteUrl
* @param url {String} Absolute or relative URL
* @param base {String} URL to be used as base
* @return {String}
*/
function absoluteUrl (linkUrl, baseUrl) {
  if (linkUrl && linkUrl.slice(0, 4) !== 'http') {
    linkUrl = baseUrl.slice(0, baseUrl.lastIndexOf('/') + 1) + linkUrl
  }
  return linkUrl
}

/**
 * Composes and returns a PATCH SPARQL query (for use with `web.patch()`)
 * @method composePatchQuery
 * @param toDel {Array<String>} List of triples to delete
 * @param toIns {Array<String>} List of triples to insert
 * @return {String} SPARQL query for use with PATCH
 */
function composePatchQuery (toDel, toIns) {
  var query = ''

  if (toDel && toDel.length > 0) {
    toDel = toDel.map(function (each) {
      if (each.endsWith('.')) {
        each = each.slice(0, -1)
      }
      return each
    })
    query += 'DELETE DATA { ' + toDel.join(' . ') + ' };\n'
  }
  if (toIns && toIns.length > 0) {
    toIns = toIns.map(function (each) {
      if (each.endsWith('.')) {
        each = each.slice(0, -1)
      }
      return each
    })
    query += 'INSERT DATA { ' + toIns.join(' . ') + ' };\n'
  }
  return query
}
