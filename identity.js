// Identity / WebID
var Solid = Solid || {};
Solid.identity = (function(window) {
    'use strict';

    // Init some defaults;
    var PROXY = "https://databox.me/proxy?uri={uri}";
    var TIMEOUT = 5000;

    $rdf.Fetcher.crossSiteProxyTemplate = PROXY;
    // common vocabs
    var OWL = $rdf.Namespace("http://www.w3.org/2002/07/owl#");
    var PIM = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
    var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");

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

                    var checkAll = function() {
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
                                    checkAll();
                                }
                            ).catch(
                            function(err){
                                console.log(err);
                                toLoad--;
                                checkAll();
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
                                    checkAll();
                                }
                            ).catch(
                            function(err){
                                console.log(err);
                                toLoad--;
                                checkAll();
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
                                    checkAll();
                                }
                            ).catch(
                            function(err){
                                console.log(err);
                                toLoad--;
                                checkAll();
                            });
                        });
                    }
                }
            )
            .catch(
                function(err) {
                    console.log("Could not load",url);
                    resolve(err);
                }
            );
        });

        return promise;
    };

    // Find the user's workspaces
    var getWorkspaces = function(webid, graph) {
        var promise = new Promise(function(resolve, reject){
            if (!graph) {
                // fetch profile
                getProfile(webid).then(function(g) {
                    return getWorkspaces(webid, g);
                }).catch(function(err){
                    reject(err);
                });
            } else {
                // find workspaces
                console.log(graph);
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
