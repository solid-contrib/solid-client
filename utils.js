// Helper functions
var Solid = Solid || {}
Solid.utils = (function (window) {
  'use strict'

  // parse a Link header
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

  // append statements from one graph object to another
  function appendGraph (toGraph, fromGraph, docURI) {
    var why = (docURI) ? $rdf.sym(docURI) : undefined
    fromGraph.statementsMatching(undefined, undefined, undefined, why).forEach(function (st) {
      toGraph.add(st.subject, st.predicate, st.object, st.why)
    })
  }

  return {
    parseLinkHeader: parseLinkHeader,
    appendGraph: appendGraph
  }
}(this))
