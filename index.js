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

Solid.js is a Javascript library for Solid applications. This library currently
depends on rdflib.js. Please make sure to load the rdflib.js script before
loading solid.js.

If you would like to know more about the solid Solid project, please see
https://github.com/solid/solid
*/
'use strict'
/**
 * Provides a Solid client helper object (which exposes various static modules).
 * @module solid.js
 * @main solid.js
 */

/**
 * @class Solid
 * @static
 */
var Solid = {
  acl: require('./lib/permissions/authorization').acl,
  auth: require('./lib/auth'),
  config: require('./config'),
  currentUser: require('./lib/auth').currentUser,
  getProfile: require('./lib/identity').getProfile,
  getPermissions: require('./lib/permissions').getPermissions,
  clearPermissions: require('./lib/permissions').clearPermissions,
  identity: require('./lib/identity'),
  login: require('./lib/auth').login,
  meta: require('./lib/meta'),
  signup: require('./lib/auth').signup,
  status: require('./lib/status'),
  vocab: require('./lib/vocab'),
  web: require('./lib/web')
}

module.exports = Solid
