'use strict'
/**
 * Provides a Solid web client class for performing LDP CRUD operations.
 * @module web
 */

var XMLHttpRequest = require('xhr2')
// Init some defaults
var PROXY = 'https://databox.me/,proxy?uri={uri}'
var TIMEOUT = 5000

$rdf.Fetcher.crossSiteProxyTemplate = PROXY
// common vocabs
var LDP = $rdf.Namespace('http://www.w3.org/ns/ldp#')

/**
 * Parses a Link header from an XHR HTTP Request.
 * @method parseLinkHeader
 * @param link {String} Contents of the Link response header
 * @return {Object}
 */
var parseLinkHeader = function parseLinkHeader (link) {
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

/**
 * Parses an XHR response and composes a meta object
 * @method parseResponseMeta
 * @param resp {XMLHttpRequest} Result of an XHR
 * @return {Object} Parsed response object
 */
function parseResponseMeta (resp) {
  var h = parseLinkHeader(resp.getResponseHeader('Link'))
  var meta = {}
  meta.url = (resp.getResponseHeader('Location'))
    ? resp.getResponseHeader('Location')
    : resp.responseURL
  meta.acl = h['acl']
  meta.meta = (h['meta']) ? h['meta'] : h['describedBy']
  meta.user = (resp.getResponseHeader('User'))
    ? resp.getResponseHeader('User')
    : ''
  meta.websocket = (resp.getResponseHeader('Updates-Via'))
    ? resp.getResponseHeader('Updates-Via')
    : ''
  // writable/editable resource
  meta.editable = []
  var patch = resp.getResponseHeader('Accept-Patch')
  if (patch && patch.indexOf('application/sparql-update') >= 0) {
    meta.editable.push('patch')
  }
  var allow = resp.getResponseHeader('Allow')
  if (allow) {
    if (allow.indexOf('PUT') >= 0) {
      meta.editable.push('put')
    }
    if (allow.indexOf('POST') >= 0) {
      meta.editable.push('post')
    }
    if (allow.indexOf('DELETE') >= 0) {
      meta.editable.push('delete')
    }
  }

  meta.exists = (resp.status === 200)
  meta.xhr = resp
  return meta
}

/**
 * Providers a collection of Solid/LDP web operations (CRUD)
 * @class SolidWebClient
 * @static
 */
var SolidWebClient = {
  /**
   * Checks to see if a Solid resource exists, and returns useful resource
   *   metadata info.
   * @method head
   * @param url {String} URL of a resource or container
   * @return {Promise} Result of an HTTP HEAD operation (returns a meta object)
   */
  head: function head (url) {
    var promise = new Promise(function (resolve) {
      var http = new XMLHttpRequest()
      http.open('HEAD', url)
      http.withCredentials = true
      http.onreadystatechange = function () {
        if (this.readyState === this.DONE) {
          resolve(parseResponseMeta(this))
        }
      }
      http.send()
    })

    return promise
  },

  /**
   * Retrieves a resource or container by making an HTTP GET call.
   * @method get
   * @param url {String} URL of the resource or container to fetch
   * @return {Promise|Object} Result of the HTTP GET operation
   */
  get: function get (url) {
    var promise = new Promise(function (resolve, reject) {
      var g = $rdf.graph()
      var f = new $rdf.Fetcher(g, TIMEOUT)

      var docURI = (url.indexOf('#') >= 0)
        ? url.slice(0, url.indexOf('#'))
        : url
      f.nowOrWhenFetched(docURI, undefined, function (ok, body, xhr) {
        if (!ok) {
          reject({status: xhr.status, xhr: xhr})
        } else {
          resolve(g)
        }
      })
    })

    return promise
  },

  /**
   * Creates a new resource by performing
   *   a Solid/LDP POST operation to a specified container.
   * @param url {String} URL of the container to post to
   * @param data {Object} Data/payload of the resource to be created
   * @param slug {String} Suggested URL fragment for the new resource
   * @param isContainer {Boolean} Is the object being created a Container
   *            or Resource?
   * @param mime {String} MIME Type
   * @method post
   * @return {Promise|Object} Result of XHR POST (returns parsed
   *     response meta object) or an anonymous error object with status code
   */
  post: function post (url, data, slug, isContainer, mime) {
    var resType = LDP('Resource').uri
    if (isContainer) {
      resType = LDP('BasicContainer').uri
      mime = 'text/turtle' // force right mime for containers only
    }
    mime = mime || 'text/turtle'
    var promise = new Promise(function (resolve, reject) {
      var http = new XMLHttpRequest()
      http.open('POST', url)
      http.setRequestHeader('Content-Type', mime)
      http.setRequestHeader('Link', '<' + resType + '>; rel="type"')
      if (slug && slug.length > 0) {
        http.setRequestHeader('Slug', slug)
      }
      http.withCredentials = true
      http.onreadystatechange = function () {
        if (this.readyState === this.DONE) {
          if (this.status === 200 || this.status === 201) {
            return resolve(parseResponseMeta(this))
          } else {
            reject({status: this.status, xhr: this})
          }
        }
      }
      if (data && data.length > 0) {
        http.send(data)
      } else {
        http.send()
      }
    })

    return promise
  },

  /**
   * Updates an existing resource or creates a new resource by performing
   *   a Solid/LDP PUT operation to a specified container
   * @method put
   * @param url {String} URL of the resource to be updated/created
   * @param data {Object} Data/payload of the resource to be created or updated
   * @param mime {String} MIME Type of the resource to be created
   * @return {Promise|Object} Result of PUT operation (returns parsed response
   *     meta object if successful, rejects with an anonymous error status
   *     object if not successful)
   */
  put: function put (url, data, mime) {
    var promise = new Promise(function (resolve, reject) {
      mime = mime || 'text/turtle'
      var http = new XMLHttpRequest()
      http.open('PUT', url)
      http.setRequestHeader('Content-Type', mime)
      http.withCredentials = true
      http.onreadystatechange = function () {
        if (this.readyState === this.DONE) {
          if (this.status === 200 || this.status === 201) {
            return resolve(parseResponseMeta(this))
          } else {
            reject({status: this.status, xhr: this})
          }
        }
      }
      // Handle network errors
      http.onerror = function () {
        reject(Error('Network Error'))
      }
      if (data) {
        http.send(data)
      } else {
        http.send()
      }
    })

    return promise
  },

  /**
   * Partially edits an RDF-type resource by performing a PATCH operation.
   *   Accepts arrays of individual statements (in Turtle format) as params.
   *   For example:
   *   [ '<a> <b> <c> .', '<d> <e> <f> .']
   * @method patch
   * @param url {String} URL of the resource to be edited
   * @param toDel {Array<String>} Triples to remove from the resource
   * @param toIns {Array<String>} Triples to insert into the resource
   * @return {Promise|Object} Result of PATCH operation (returns parsed response
   *     meta object if successful, rejects with an anonymous error status
   *     object if not successful)
   */
  patch: function patch (url, toDel, toIns) {
    var promise = new Promise(function (resolve, reject) {
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

      var http = new XMLHttpRequest()
      http.open('PATCH', url)
      http.setRequestHeader('Content-Type', 'application/sparql-update')
      http.withCredentials = true
      http.onreadystatechange = function () {
        if (this.readyState === this.DONE) {
          if (this.status === 200 || this.status === 201) {
            return resolve(parseResponseMeta(this))
          } else {
            reject({status: this.status, xhr: this})
          }
        }
      }
      if (data && data.length > 0) {
        http.send(data)
      } else {
        http.send()
      }
    })

    return promise
  },

  /**
   * Deletes an existing resource or container.
   * @method del
   * @param url {String} URL of the resource or container to be deleted
   * @return {Promise|Object} Result of the HTTP Delete operation (returns true
   *   on success, or an anonymous error object on failure)
   */
  del: function del (url) {
    var promise = new Promise(function (resolve, reject) {
      var http = new XMLHttpRequest()
      http.open('DELETE', url)
      http.withCredentials = true
      http.onreadystatechange = function () {
        if (this.readyState === this.DONE) {
          if (this.status === 200 || this.status === 201) {
            return resolve(true)
          } else {
            reject({status: this.status, xhr: this})
          }
        }
      }
      http.send()
    })

    return promise
  }
}

// Alias some extra Solid web client methods
SolidWebClient.create = SolidWebClient.post
SolidWebClient.replace = SolidWebClient.put
SolidWebClient.update = SolidWebClient.patch

module.exports = SolidWebClient
