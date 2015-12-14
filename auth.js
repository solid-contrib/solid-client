
// WebID authentication and signup
var Solid = Solid || {};
Solid.auth = (function(window) {
    'use strict';

   // default (preferred) authentication endpoint
    var authEndpoint = 'https://databox.me/';
    var signupEndpoint = 'https://solid.github.io/solid-idps/';

    // attempt to find the current user's WebID from the User header if authenticated
    // resolve(webid) - string
    var login = function(url) {
        url = url || window.location.origin+window.location.pathname;
        var promise = new Promise(function(resolve, reject) {
            var http = new XMLHttpRequest();
            http.open('HEAD', url);
            http.withCredentials = true;
            http.onreadystatechange = function() {
                if (this.readyState == this.DONE) {
                    if (this.status === 200) {
                        var user = this.getResponseHeader('User');
                        if (user && user.length > 0 && user.slice(0, 4) == 'http') {
                            return resolve(user);
                        }
                    }
                    // authenticate to a known endpoint
                    var http = new XMLHttpRequest();
                    http.open('HEAD', authEndpoint);
                    http.withCredentials = true;
                    http.onreadystatechange = function() {
                        if (this.readyState == this.DONE) {
                            if (this.status === 200) {
                                var user = this.getResponseHeader('User');
                                if (user && user.length > 0 && user.slice(0, 4) == 'http') {
                                    return resolve(user);
                                }
                            }
                            return reject({ok: false, status: this.status, body: this.responseText, xhr: this});
                        }
                    };
                    http.send();
                }
            };
            http.send();
        });

        return promise;
    };

    // Open signup window
    var signup = function(url) {
        url = url || signupEndpoint;
        var leftPosition, topPosition;
        var width = 1024;
        var height = 600;
        // set borders
        leftPosition = (window.screen.width / 2) - ((width / 2) + 10);
        // set title and status bars
        topPosition = (window.screen.height / 2) - ((height / 2) + 50);
        window.open(url+"?origin="+encodeURIComponent(window.location.origin), "Solid signup", "resizable,scrollbars,status,width="+width+",height="+height+",left="+ leftPosition + ",top=" + topPosition);

        var promise = new Promise(function(resolve, reject) {
            console.log("Starting listener");
            listen().then(function(webid) {
                return resolve(webid);
            }).catch(function(err){
                return reject(err);
            });
        });

        return promise;
    };

    // Listen to login messages from child window/iframe
    var listen = function() {
        var promise = new Promise(function(resolve, reject){
            console.log("In listen()");
            var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
            var eventListener = window[eventMethod];
            var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";
            eventListener(messageEvent,function(e) {
                var u = e.data;
                if (u.slice(0,5) == 'User:') {
                    var user = u.slice(5, u.length);
                    if (user && user.length > 0 && user.slice(0,4) == 'http') {
                        return resolve(user);
                    } else {
                        return reject(user);
                    }
                }
            },true);
        });

        return promise;
    };

    // return public methods
    return {
        login: login,
        signup: signup,
        listen: listen,
    };
}(this));
