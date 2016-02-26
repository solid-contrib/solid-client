/**
 * Sample result of listing an Solid/LDP BasicContainer
 */
module.exports = `
# solid.web.list('/settings/')
@prefix ldp: <http://www.w3.org/ns/ldp#>.
@prefix st: <http://www.w3.org/ns/posix/stat#>.
@prefix terms: <http://www.w3.org/ns/solid/terms#>.

<>
    a ldp:BasicContainer, ldp:Container;
    ldp:contains
        <ajax-loader.gif>,
        <index.html>,
        <prefs.ttl>,
        <privateTypeIndex.ttl>,
        <publicTypeIndex.ttl>,
        <testcontainer/>;
    st:mtime
       1456505134;
    st:size
       272.
<ajax-loader.gif>
    a ldp:Resource; st:mtime 1456505134; st:size 634 .
<index.html>
    a ldp:Resource; st:mtime 1456505118; st:size 0 .
<prefs.ttl>
    a ldp:Resource; st:mtime 1455289601; st:size 311 .
<privateTypeIndex.ttl>
    a ldp:Resource, terms:PrivateTypeIndex; st:mtime 1456418827; st:size 273.
<publicTypeIndex.ttl>
    a ldp:Resource, terms:PublicTypeIndex; st:mtime 1456418862; st:size 257.
<testcontainer/>
    a ldp:BasicContainer, ldp:Container, ldp:Resource;
    st:mtime
       1456505098;
    st:size
       68.
`
