'use strict'
/**
 * Provides misc utility functions for the web client
 * @module web-util
 */

/**
 * Extracts the allowed HTTP methods from the 'Allow' and 'Accept-Patch'
 * headers, and returns a hashmap of verbs allowed by the server
 * @method parseAllowedMethods
 * @param allowHeader {String} `Allow:` response header
 * @param acceptPatchHeader {String} `Accept-Patch` response header
 * @param allowMethodsHeader {String} `Access-Control-Allow-Methods` response
 *   header
 * @return {Object} Hashmap of verbs allowed by the server. Example:
 *   ```
 *   {
 *     'GET': true,
 *     'PUT': true
 *   }
 *   ```
 */
function parseAllowedMethods (allowHeader, acceptPatchHeader,
    allowMethodsHeader) {
  var allowedMethods = {}
  if (allowHeader) {
    var verbs = ['HEAD', 'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    verbs.forEach(function (methodName) {
      if (allowHeader.indexOf(methodName) >= 0 ||
          allowMethodsHeader.indexOf(methodName) >= 0) {
        allowedMethods[methodName] = true
      }
    })
  }
  if (acceptPatchHeader &&
      acceptPatchHeader.indexOf('application/sparql-update') >= 0) {
    this.allowedMethods.patch = true
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
      rels[rel] = href
    }
  }
  return rels
}

function composePatchQuery (toDel, toIns) {
  var data = ''
  var i
  if (toDel && toDel.length > 0) {
    for (i = 0; i < toDel.length; i++) {
      if (i > 0) {
        data += ' ;\n'
      }
      data += 'DELETE DATA { ' + toDel[i] + ' }'
    }
  }
  if (toIns && toIns.length > 0) {
    for (i = 0; i < toIns.length; i++) {
      if (i > 0 || (toDel && toDel.length > 0)) {
        data += ' ;\n'
      }
      data += 'INSERT DATA { ' + toIns[i] + ' }'
    }
  }
  return data
}

module.exports.composePatchQuery = composePatchQuery
module.exports.parseAllowedMethods = parseAllowedMethods
module.exports.parseLinkHeader = parseLinkHeader
