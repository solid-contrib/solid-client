'use strict'
/**
 * @module notification
 */
module.exports = SolidNotification
var rdf = require('../util/rdf-parser').rdflib
// var graphUtil = require('../util/graph-util')
// var parseLinks = graphUtil.parseLinks
var vocab = require('../vocab')

/**
 * @class SolidNotification
 * @constructor
 */
function SolidNotification (options) {
  options = options || {}
  this.title = options.title
  this.body = options.body
  this.authors = []
  this.initAuthors(options)
  this.to = []
  this.initRecipients(options)
}

/**
 * @method buildGraph
 * @return {Graph}
 */
SolidNotification.prototype.buildGraph = function buildGraph () {
  var graph = rdf.graph()
  var thisDoc = rdf.sym('')
  graph.addStatement(rdf.st(thisDoc, vocab.rdf('type'), vocab.solid('Notification')))
  if (this.title) {
    graph.addStatement(rdf.st(thisDoc, vocab.dcterms('title'), this.title))
  }
  if (this.body) {
    graph.addStatement(rdf.st(thisDoc, vocab.sioc('content'), this.body))
  }
  var authorFragment
  var authorCount = 1
  this.authors.forEach(function (author) {
    authorFragment = rdf.sym('#author' + authorCount)
    graph.addStatement(rdf.st(thisDoc, vocab.sioc('has_creator'),
      authorFragment))
    graph.add([
      rdf.st(authorFragment, vocab.rdf('type'), vocab.sioc('UserAccount')),
      rdf.st(authorFragment, vocab.sioc('account_of'), rdf.sym(author.webid))
    ])
    authorCount += 1
  })
  return graph
}

SolidNotification.prototype.hasAuthor = function hasAuthor () {
  return this.authors.length > 0
}

SolidNotification.prototype.initAuthors = function initAuthors (options) {
  var author
  if (typeof options.from === 'string') {
    author = {}
    author.webid = options.from
    this.authors.push(author)
  }
}

/**
 * @method initAuthorsFromGraph
 * @param authorFragment {NamedNode} Author hash fragment uri
 * @param graph {Graph} Parsed graph of the notification
 */
SolidNotification.prototype.initAuthorsFromGraph =
  function initAuthorsFromGraph (authorFragment, graph) {
    var match
    var author
    match = graph.statementsMatching(authorFragment, vocab.sioc('account_of'))
    if (match.length > 0) {
      author = {}
      author.webid = match[0].object.uri
      this.authors.push(author)
    }
  }

/**
 * @method initFromGraph
 * @param graph {Graph} RDF Graph (parsed from the source notification)
 */
SolidNotification.prototype.initFromGraph = function initFromGraph (url, graph) {
  var self = this
  var subj = rdf.sym(url)
  var match
  match = graph.statementsMatching(subj, vocab.dcterms('title'))
  if (match.length > 0) {
    this.title = match[0].object.value
  }
  match = graph.statementsMatching(subj, vocab.sioc('content'))
  if (match.length > 0) {
    this.body = match[0].object.value
  }
  match = graph.statementsMatching(subj, vocab.sioc('has_creator'))
  var authorFragment
  match.forEach(function (authorMatch) {
    authorFragment = authorMatch.object
    self.initAuthorsFromGraph(authorFragment, graph)
  })
}

/**
 * Initializes the recipients of the notification. (Supporting just one
 * recipient to start with.)
 * @method initRecipients
 * @param options {Array<Object>}
 */
SolidNotification.prototype.initRecipients = function initRecipients (options) {
  if (options.to) {
    this.to = [ options.to ]
  }
}

/**
 * Serializes this notification to a string RDF representation (Turtle by
 * default).
 * @method serialize
 * @param [contentType='text/turtle'] {String}
 * @throws {Error} Rejects with an error if one is encountered during RDF
 *   serialization.
 * @return {Promise<String>} Graph serialized to contentType RDF syntax
 */
SolidNotification.prototype.serialize = function serialize (contentType) {
  contentType = contentType || 'text/turtle'
  var graph = this.buildGraph()
  var target = null
  var base = null
  return new Promise(function (resolve, reject) {
    rdf.serialize(target, graph, base, contentType, function (err, result) {
      if (err) { return reject(err) }
      if (!result) {
        return reject(new Error('Error serializing notification to ' +
          contentType))
      }
      resolve(result)
    })
  })
}
