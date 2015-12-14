// Events
Solid = Solid || {};
Solid.status = (function(window) {
    'use strict';

    // Get current online status
    var isOnline = function() {
        return window.navigator.onLine;
    };

    // Is offline
    var onOffline = function(callback) {
        window.addEventListener("offline", callback, false);
    };
    // Is online
    var onOnline = function(callback) {
        window.addEventListener("online", callback, false);
    };

    // return public methods
    return {
        isOnline: isOnline,
        onOffline: onOffline,
        onOnline: onOnline,
    };
}(this));
