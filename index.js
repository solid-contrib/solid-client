var Solid = {
  auth: require('./lib/auth'),
  identity: require('./lib/identity'),
  meta: require('./lib/meta'),
  status: require('./lib/status'),
  utils: require('./lib/utils'),
  web: require('./lib/web')
}

if (typeof tabulator !== 'undefined') {
  tabulator.solid = Solid
}

module.exports = Solid
