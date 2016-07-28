'use strict'
// var graphUtil = require('./util/graph-util.js')
// var rdf = require('./util/rdf-parser').rdflib
// var util = require('./util/web-util.js')
// var vocab = require('./vocab')
// var webClient = require('./web')
// var webUtil = require('./util/web-util.js')
// var SolidNotification = require('./models/notification')

function sendNotification (notification) {
  if (!notification.hasRecipient()) {
    throw new Error('Cannot send a notification with no recipient')
  }
  notification.to.forEach(function (recipient) {
    sendNotificationTo(notification, recipient)
  })
}

function sendNotificationTo (notification, recipient) {
  if (typeof recipient === 'string') {
    // This is a webid. Load a profile
  }
}

module.exports.sendNotification = sendNotification
