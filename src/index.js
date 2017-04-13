/*
The MIT License (MIT)

Copyright (c) 2015-2016 Solid

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

solid-client is a Javascript library for Solid applications.

If you would like to know more about the solid Solid project, please see
https://github.com/solid/solid
*/
'use strict'
/**
 * Provides a Solid client helper object (which exposes various static modules).
 * @module solid-client
 * @main solid-client
 */

const rdf = require('./util/rdf-parser')
const ClientAuthOIDC = require('solid-auth-oidc')
const auth = new ClientAuthOIDC()
const webClient = require('solid-web-client')(rdf, { auth })
const ClientAuthTLS = require('solid-auth-tls')
const tls = new ClientAuthTLS(webClient)
const identity = require('./identity')
const ns = require('solid-namespace')(rdf)
const acl = require('solid-permissions')

/**
 * @class Solid
 * @static
 */
const Solid = {
  acl,
  AppRegistration: require('./solid/app-registration'),
  appRegistry: require('./app-registry'),
  auth,
  tls,
  config: require('../config'),
  currentUser: tls.currentUser.bind(tls),
  identity: require('./identity'),
  login: tls.login.bind(tls),
  meta: require('./meta'),
  rdflib: rdf,
  signup: tls.signup.bind(tls),
  status: require('./status'),
  typeRegistry: require('./type-registry'),
  vocab: ns,
  web: webClient
}

Solid.clearPermissions = function clearPermissions (uri) {
  return acl.clearPermissions(uri, webClient)
}
Solid.discoverWebID = function discoverWebID (url) {
  return identity.discoverWebID(url, webClient, ns)
}
Solid.getPermissions = function getPermissions (uri) {
  return acl.getPermissions(uri, webClient, rdf)
}
Solid.getProfile = function getProfile (profileUrl, options) {
  return identity.getProfile(profileUrl, options, webClient, rdf)
}

module.exports = Solid
