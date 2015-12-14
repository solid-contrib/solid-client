# solid.js
[![](https://img.shields.io/badge/project-Solid-7C4DFF.svg?style=flat-square)](https://github.com/solid/solid)

Javascript library for Solid applications

# Examples

Here are some useful examples of functions you can implement in your own app. Just make sure you include the `solid.js` script in your HTML page.


## Login

```
var login = function() {
    // Get the current user
    Solid.auth.login().then(function(webid){
    	// authentication succeeded
        gotWebID(webid);
    }).catch(function(err) {
        // authentication failed
        console.log(err);
    });
};
    
```

## Signup
```
// Signup for a WebID
var signup = function() {
    Solid.auth.signup().then(function(webid) {
    	// authentication succeeded
        console.log(webid);
    }).catch(function(err) {
        // authentication failed
        console.log(err);
    });
};
```
