'use strict'

var test = require('tape')
var SolidNotification = require('../../lib/models/notification')
const parseGraph = require('../../lib/util/graph-util').parseGraph
const rawNotificationSource = require('../resources/notification-ttl')
const notificationUrl = 'https://bob.example.com/inbox/nABC.ttl'
const notificationGraph = parseGraph(notificationUrl, rawNotificationSource, 'text/turtle')

var ALICE_WEBID = 'https://alice.example.com/profile/card#me'
var BOB_WEBID = 'https://bob.example.com/profile/card#me'

test('SolidNotification test', function (t) {
  let options = {
    title: 'Notification title',
    body: 'Notification contents',
    from: ALICE_WEBID,
    to: BOB_WEBID
  }
  let n = new SolidNotification(options)
  t.equal(n.title, 'Notification title')
  t.equal(n.body, 'Notification contents')
  t.equal(n.authors[0].webid, ALICE_WEBID)
  t.equal(n.to[0], BOB_WEBID)
  t.end()
})

test('Notification serialized & deserialized round trip test', function (t) {
  var notification = new SolidNotification()
  notification.initFromGraph(notificationUrl, notificationGraph)
  // t.plan(2)
  // Now check to make sure serialize() & reparse results in the same set
  return notification.serialize()
    .then((serializedTurtle) => {
      console.log(serializedTurtle)
      // Now that the Notification is serialized to a Turtle string,
      // let's re-parse that string into a new graph
      let parsedGraph = parseGraph(notificationUrl, serializedTurtle,
        'text/turtle')
      let n2 = new SolidNotification()
      n2.initFromGraph(notificationUrl, parsedGraph)
      t.equal(n2.title, 'Notification title')
      t.equal(n2.body, 'Notification contents')
      t.equal(n2.authors.length, 1)
      t.equal(n2.authors[0].webid, ALICE_WEBID)
      t.end()
    })
    .catch(function (err) {
      console.log('Error:', err)
      t.end()
    })
})
