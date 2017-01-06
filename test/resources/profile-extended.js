/**
 * Sample LDNode user profile, for use with `solid-profile-test.js`
 */
module.exports = `@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix owl: <http://www.w3.org/2002/07/owl#>.
@prefix sp: <http://www.w3.org/ns/pim/space#>.
@prefix loc: </>.
@prefix terms: <http://www.w3.org/ns/solid/terms#>.
@prefix inbox: </inbox/>.
@prefix cert: <http://www.w3.org/ns/auth/cert#>.
@prefix ter: <http://purl.org/dc/terms/>.
@prefix XML: <http://www.w3.org/2001/XMLSchema#>.

<>
  a foaf:PersonalProfileDocument;
  foaf:primaryTopic <#me>;
  rdfs:seeAlso </settings/privateProfile1.ttl>.

<#me>
    a    foaf:Person;
    foaf:name "Alice";
    foaf:img </profile/img.png>;

    # owl:sameAs, rdfs:seeAlso, and sp:preferencesFile link
    #   to the Extended Profile
    owl:sameAs </settings/privateProfile2.ttl>;
    cert:key
       <#key-1455289666916>;
    # This preferencesFile can be thought of as a private profile
    sp:preferencesFile
       </settings/prefs.ttl>;
    # Add a duplicate Preferences link, to test client side de-duplication
    sp:preferencesFile
       </settings/prefs.ttl>;

    # Link to root storage container
    sp:storage
       loc:;
    # Link to the public (listed) Type Registry index.
    # The link to the private (unlisted) index is in the private profile
    terms:publicTypeIndex
       </settings/publicTypeIndex.ttl>;
    # Link to the public App Registry.
    terms:publicAppRegistry
      </settings/publicAppRegistry.ttl>;
    # Link to the Solid messaging inbox
    terms:inbox
       inbox:.

# Public key certificate section
<#key-1455289666916>
    ter:created
       "2016-02-12T15:07:46.916Z"^^XML:dateTime;
    ter:title
       "Created by ldnode";
    a    cert:RSAPublicKey;
    rdfs:label
       "LDNode Localhost Test Cert";
    cert:exponent
       "65537"^^XML:int;
    cert:modulus
        "970E88053BC7D146A50AFAB79044B9D3BACE8B1283AB98BBDD9B598799AEB9711A7DA9A2CCA50A9F5D30C776EA06FA749F84A359B2CBC9DEF9F4DF7C27E7ED143A25E5F658CC12C87986482200969A3C04AB29BED20860791CEA1D515952821E1FFEE4CBF5F5F9949D6E2C88CDAFEB64C5D610A3B97E58AD19585B4DFDD2AA662FDB8F7889EBAA97D53FEE5740B71549E00A8DA0565DF2A901718D60AC6281642D592C865921F525640BC2FB8BC9EF79A3171F156120C41557374CE1FE735A8948C43B44399495EB4392E57C6FC17B4AD72ABA831C1BF40EA75C01F79CDFEE95CA38DAA7C4DDDFEC4ECED90091D3E68B7C0D364BEF5C454849FE6AA5E5167801"^^XML:hexBinary.
`
