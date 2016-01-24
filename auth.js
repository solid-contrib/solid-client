/*
The MIT License (MIT)

Copyright (c) 2015 Solid

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
https://github.com/solid/

*/

// WebID authentication and signup

var Solid = Solid || {}
if (typeof tabulator !== 'undefined') {
    tabulator.solid = Solid;
}
Solid.auth = (function () {
  'use strict'

  // default (preferred) authentication endpoint
  var authEndpoint = 'https://databox.me/'
  var signupEndpoint = 'https://solid.github.io/solid-idps/'

  // attempt to find the current user's WebID from the User header if authenticated
  // resolve(webid) - string
  function login (url) {
    url = url || window.location.origin + window.location.pathname
    var promise = new Promise(function (resolve, reject) {
      var http = new XMLHttpRequest()
      http.open('HEAD', url)
      http.withCredentials = true
      http.onreadystatechange = function () {
        if (this.readyState === this.DONE) {
          if (this.status === 200) {
            var user = this.getResponseHeader('User')
            if (user && user.length > 0 && user.slice(0, 4) === 'http') {
              return resolve(user)
            }
          }
          // authenticate to a known endpoint
          var http = new XMLHttpRequest()
          http.open('HEAD', authEndpoint)
          http.withCredentials = true
          http.onreadystatechange = function () {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                var user = this.getResponseHeader('User')
                if (user && user.length > 0 && user.slice(0, 4) === 'http') {
                  return resolve(user)
                }
              }
              return reject({status: this.status, xhr: this})
            }
          }
          http.send()
        }
      }
      http.send()
    })

    return promise
  }

  // Open signup window
  function signup (url) {
    url = url || signupEndpoint
    var leftPosition, topPosition
    var width = 1024
    var height = 600
    // set borders
    leftPosition = (window.screen.width / 2) - ((width / 2) + 10)
    // set title and status bars
    topPosition = (window.screen.height / 2) - ((height / 2) + 50)
    window.open(url + '?origin=' + encodeURIComponent(window.location.origin), 'Solid signup', 'resizable,scrollbars,status,width=' + width + ',height=' + height + ',left=' + leftPosition + ',top=' + topPosition)

    var promise = new Promise(function (resolve, reject) {
      listen().then(function (webid) {
        return resolve(webid)
      }).catch(function (err) {
        return reject(err)
      })
    })

    return promise
  }

  // Listen to login messages from child window/iframe
  function listen () {
    var promise = new Promise(function (resolve, reject) {
      var eventMethod = window.addEventListener ? 'addEventListener' : 'attachEvent'
      var eventListener = window[eventMethod]
      var messageEvent = eventMethod === 'attachEvent' ? 'onmessage' : 'message'
      eventListener(messageEvent, function (e) {
        var u = e.data
        if (u.slice(0, 5) === 'User:') {
          var user = u.slice(5, u.length)
          if (user && user.length > 0 && user.slice(0, 4) === 'http') {
            return resolve(user)
          } else {
            return reject(user)
          }
        }
      }, true)
    })

    return promise
  }

  // return public methods
  return {
    login: login,
    signup: signup,
    listen: listen
  }
}(this))
