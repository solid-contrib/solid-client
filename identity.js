// Identity / WebID
var Solid = Solid || {};
Solid.identity = (function(window) {
    'use strict';

    // common vocabs
    var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
    var OWL = $rdf.Namespace("http://www.w3.org/2002/07/owl#");
    var PIM = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
    var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
    var DCT = $rdf.Namespace("http://purl.org/dc/terms/");

    // fetch user profile (follow sameAs links) and return promise with a graph
    // resolve(graph)
    var getProfile = function(url) {
        var promise = new Promise(function(resolve, reject) {
            // Load main profile
            Solid.web.get(url).then(
                function(graph) {
                    // set WebID
                    url = (url.indexOf('#') >= 0)?url.slice(0, url.indexOf('#')):url;
                    var webid = graph.any($rdf.sym(url), FOAF('primaryTopic'));
                    // find additional resources to load
                    var toLoad = [];
                    toLoad = toLoad.concat(graph.statementsMatching(webid, OWL('sameAs'), undefined, $rdf.sym(url)));
                    toLoad = toLoad.concat(graph.statementsMatching(webid, OWL('seeAlso'), undefined, $rdf.sym(url)));
                    toLoad = toLoad.concat(graph.statementsMatching(webid, PIM('preferencesFile'), undefined, $rdf.sym(url)));
                    var total = toLoad.length;
                    // sync promises externally instead of using Promise.all() which fails if one GET fails
                    var syncAll = function() {
                        if (total === 0) {
                            return resolve(graph);
                        }
                    }
                    if (total === 0) {
                        return resolve(graph);
                    }
                    // Load other files
                    toLoad.forEach(function(prof){
                        Solid.web.get(prof.object.uri).then(
                            function(g) {
                                Solid.utils.appendGraph(graph, g, prof.object.uri);
                                total--;
                                syncAll();
                            }
                        ).catch(
                        function(err){
                            total--;
                            syncAll();
                        });
                    });
                }
            )
            .catch(
                function(err) {
                    reject(err);
                }
            );
        });

        return promise;
    };

    // Find the user's workspaces
    // Return an object with the list of objects (workspaces)
    var getWorkspaces = function(webid, graph) {
        var promise = new Promise(function(resolve, reject){
            if (!graph) {
                // fetch profile and call function again
                getProfile(webid).then(function(g) {
                    getWorkspaces(webid, g).then(function(ws) {
                        return resolve(ws);
                    }).catch(function(err) {
                        return reject(err);
                    });
                }).catch(function(err){
                    return reject(err);
                });
            } else {
                // find workspaces
                var workspaces = [];
                var ws = graph.statementsMatching($rdf.sym(webid), PIM('workspace'), undefined);
                if (ws.length === 0) {
                    return resolve(workspaces);
                }
                ws.forEach(function(w){
                    // try to get some additional info - i.e. desc/title
                    var workspace = {};
                    var title = graph.any(w.object, DCT('title'));
                    if (title && title.value) {
                        workspace.title = title.value;
                    }
                    workspace.url = w.object.uri;
                    workspace.statements = graph.statementsMatching(w.object, undefined, undefined);
                    workspaces.push(workspace);
                });
                return resolve(workspaces);
            }
        });

        return promise;
    };

    // Find the user's writable profiles
    // Return an object with the list of profile URIs
    var getWritableProfiles = function(webid, graph) {
        var promise = new Promise(function(resolve, reject){
            if (!graph) {
                // fetch profile and call function again
                getProfile(webid).then(function(g) {
                    getWritableProfiles(webid, g).then(function(list) {
                        return resolve(list);
                    }).catch(function(err) {
                        return reject(err);
                    });
                }).catch(function(err){
                    return reject(err);
                });
            } else {
                // find profiles
                var profiles = [];

                webid = (webid.indexOf('#') >= 0)?webid.slice(0, webid.indexOf('#')):webid;
                var user = graph.any($rdf.sym(webid), FOAF('primaryTopic'));
                // find additional resources to load
                var toLoad = [];
                toLoad = toLoad.concat(graph.statementsMatching(user, OWL('sameAs'), undefined, $rdf.sym(webid)));
                toLoad = toLoad.concat(graph.statementsMatching(user, OWL('seeAlso'), undefined, $rdf.sym(webid)));
                toLoad = toLoad.concat(graph.statementsMatching(user, PIM('preferencesFile'), undefined, $rdf.sym(webid)));
                // also check this (main) profile doc
                toLoad = toLoad.concat({object: {uri: webid}});
                var total = toLoad.length;
                // sync promises externally instead of using Promise.all() which fails if one GET fails
                var syncAll = function() {
                    if (total === 0) {
                        return resolve(profiles);
                    }
                }
                if (total === 0) {
                    return resolve(profiles);
                }

                // Load sameAs files
                toLoad.forEach(function(prof){
                    var url = prof.object.uri;
                    Solid.web.head(url).then(
                        function(meta) {
                            if (meta.editable.length > 0 && profiles.indexOf(url) < 0) {
                                profiles.push({url: url, editable: meta.editable});
                            }
                            total--;
                            syncAll();
                        }
                    ).catch(
                    function(err){
                        total--;
                        syncAll();
                    });
                });
            }
        });

        return promise;
    };

    // return public methods
    return {
        getProfile: getProfile,
        getWorkspaces: getWorkspaces,
        getWritableProfiles: getWritableProfiles
    };
}(this));