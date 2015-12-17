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
        var promise = new Promise(function(resolve) {
            // Load main profile
            Solid.web.get(url).then(
                function(graph) {
                    // set WebID
                    var webid = graph.any($rdf.sym(url), FOAF('primaryTopic'));
                    // find additional resources to load
                    var sameAs = graph.statementsMatching(webid, OWL('sameAs'), undefined);
                    var seeAlso = graph.statementsMatching(webid, OWL('seeAlso'), undefined);
                    var prefs = graph.statementsMatching(webid, PIM('preferencesFile'), undefined);
                    var toLoad = sameAs.length + seeAlso.length + prefs.length;

                    // sync promises externally instead of using Promise.all() which fails if one GET fails
                    var syncAll = function() {
                        if (toLoad === 0) {
                            return resolve(graph);
                        }
                    }
                    // Load sameAs files
                    if (sameAs.length > 0) {
                        sameAs.forEach(function(same){
                            Solid.web.get(same.object.value, same.object.value).then(
                                function(g) {
                                    Solid.utils.appendGraph(graph, g);
                                    toLoad--;
                                    syncAll();
                                }
                            ).catch(
                            function(err){
                                toLoad--;
                                syncAll();
                            });
                        });
                    }
                    // Load seeAlso files
                    if (seeAlso.length > 0) {
                        seeAlso.forEach(function(see){
                            Solid.web.get(see.object.value).then(
                                function(g) {
                                    Solid.utils.appendGraph(graph, g, see.object.value);
                                    toLoad--;
                                    syncAll();
                                }
                            ).catch(
                            function(err){
                                toLoad--;
                                syncAll();
                            });
                        });
                    }
                    // Load preferences files
                    if (prefs.length > 0) {
                        prefs.forEach(function(pref){
                            Solid.web.get(pref.object.value).then(
                                function(g) {
                                    Solid.utils.appendGraph(graph, g, pref.object.value);
                                    toLoad--;
                                    syncAll();
                                }
                            ).catch(
                            function(err){
                                toLoad--;
                                syncAll();
                            });
                        });
                    }
                }
            )
            .catch(
                function(err) {
                    resolve(err);
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

    // return public methods
    return {
        getProfile: getProfile,
        getWorkspaces: getWorkspaces
    };
}(this));
