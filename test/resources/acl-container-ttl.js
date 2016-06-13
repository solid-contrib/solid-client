module.exports = `@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

<#authorization1>
    a acl:Authorization;

    # These statements specify access rules for the /docs/ container itself:
    acl:agent <https://alice.example.com/#me>;
    acl:accessTo <https://alice.example.com/docs/>;
    acl:mode
        acl:Read, acl:Write, acl:Control;

    # defaultForNew says: this authorization (the statements above) will also
    #   be inherited by any resource within that container that doesn't have its
    #   own ACL.
    acl:defaultForNew <>.
    # soon to be:
    # acl:default <>.

<#authorization2>
    a acl:Authorization;
    acl:agentClass foaf:Agent;  # everyone
    acl:mode acl:Read;  # has Read-only access
    acl:accessTo <https://alice.example.com/profile/card>. # to the public profile`
