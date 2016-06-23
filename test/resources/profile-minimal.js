/**
 * Sample LDNode user profile, for use with `solid-profile-test.js`
 */
module.exports = `@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
@prefix sp: <http://www.w3.org/ns/pim/space#>.
@prefix loc: </>.
@prefix terms: <http://www.w3.org/ns/solid/terms#>.
@prefix inbox: </inbox/>.

<>
  a foaf:PersonalProfileDocument;
  foaf:primaryTopic <#me>.

<#me>
    a    foaf:Person;
    sp:preferencesFile
       </settings/test-prefs.ttl>;

    sp:storage
       loc:;
    terms:inbox
       inbox:.
`
