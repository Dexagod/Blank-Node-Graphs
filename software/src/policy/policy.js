"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPolicyGraphToStore = void 0;
const n3_1 = require("n3");
const quad = n3_1.DataFactory.quad;
const namedNode = n3_1.DataFactory.namedNode;
const blankNode = n3_1.DataFactory.blankNode;
const defaultGraph = n3_1.DataFactory.defaultGraph;
const literal = n3_1.DataFactory.literal;
function addPolicyGraphToStore(store, policy, graph) {
    // Create graph to store policy information
    graph = graph || blankNode();
    store.addQuads(policy.map(t => quad(t.subject, t.predicate, t.object, graph)));
    return { graph, store };
}
exports.addPolicyGraphToStore = addPolicyGraphToStore;
