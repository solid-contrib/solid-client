// Events
Solid = Solid || {};
Solid.status = (function(window) {
    'use strict';

    // Get current online status
    function isOnline () {
        return window.navigator.onLine;
    };

    // Is offline
    function onOffline (callback) {
        window.addEventListener("offline", callback, false);
    };
    // Is online
    function onOnline (callback) {
        window.addEventListener("online", callback, false);
    };

    // return public methods
    return {
        isOnline: isOnline,
        onOffline: onOffline,
        onOnline: onOnline,
    };
}(this));
