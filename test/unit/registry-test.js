'use strict'

const test = require('tape')
const registry = require('../../src/registry')
const rdf = require('../../src/util/rdf-parser')
const parseGraph = require('../../src/util/graph-util').parseGraph

test('registry.isListed - invalid predicate', t => {
  let url = 'https://example.com/registry'
  let source = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
  <> <http://example.com#predicate> solid:ListedDocument.`

  let graph = parseGraph(url, source, 'text/turtle', rdf)

  t.notOk(registry.isListed(graph, rdf))
  t.end()
})

test('registry.isListed - valid predicate', t => {
  let url = 'https://example.com/registry'
  let source = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
  <> a solid:ListedDocument.`

  let graph = parseGraph(url, source, 'text/turtle', rdf)

  t.ok(registry.isListed(graph, rdf))
  t.end()
})

test('registry.isUnlisted - invalid predicate', t => {
  let url = 'https://example.com/registry'
  let source = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
  <> <http://example.com#predicate> solid:UnlistedDocument.`

  let graph = parseGraph(url, source, 'text/turtle', rdf)

  t.notOk(registry.isUnlisted(graph, rdf))
  t.end()
})

test('registry.isUnlisted - valid predicate', t => {
  let url = 'https://example.com/registry'
  let source = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
  <> a solid:UnlistedDocument.`

  let graph = parseGraph(url, source, 'text/turtle', rdf)

  t.ok(registry.isUnlisted(graph, rdf))
  t.end()
})
