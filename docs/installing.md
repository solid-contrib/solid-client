# Installing

The solid client library can be installed in several ways. It's designed to be
run in Node.js and the browser. There are three primary distributions:

1. The CommonJS module named `'solid-client'`
2. The bundled and minified `solid-client.min.js`
3. The bundled and minified `solid-client-no-rdflib.min.js` which does not
   include the (current) hard dependency on
   [`rdflib.js`](https://github.com/linkeddata/rdflib.js). This bundle is for
   developers that want to include `rdflib.js` themselves.

## Node.js

Simply install solid-client through node and then `require('solid-client')`
within your code!

```sh
$ npm install solid-client --save
```

```js
var solid = require('solid-client')
```

## Browser

We offer a few ways to install the solid client.

### CDN

If you don't need a module system, the simplest way to use the solid client in
an app is to add the `solid-client.min.js` bundle to your page.

```html
<script src="dist/solid-client.min.js"></script>
```

If you're using the `solid-client-no-rdflib.min.js` bundle, you'll need to
manually include its dependency on `rdflib.js`.

```html
<script src="https://solid.github.io/releases/rdflib.js/rdflib-0.7.0.min.js"></script>
<script src="dist/solid-client.min.js"></script>
```

### browserify

```sh
$ npm install solid-client --save
```

```js
var solid = require('solid-client')
```

### webpack

Using solid-client with webpack requires some configuration. You'll need the
json-loader for webpack and will need to exclude the xhr2 module from the build.

First install solid-client and json-loader:

```sh
$ npm install solid-client --save
$ npm install json-loader --save-dev
```

Then add the JSON loader and declare the xhr2 external in `webpack.config.js`:

```js
module.exports = {
  // ...
  module: {
    loaders: [
      {
        test: /\.json$/,
        loader: 'json'
      }
    ]
  },
  externals: {
    'xhr2': 'XMLHttpRequest'
  },
  // ...
}
```
