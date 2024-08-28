"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProvenanceTriples = exports.addProvenanceGraphToStore = void 0;
const n3_1 = require("n3");
const util_1 = require("../util/util");
const vocab_common_rdf_1 = require("@inrupt/vocab-common-rdf");
const quad = n3_1.DataFactory.quad;
const namedNode = n3_1.DataFactory.namedNode;
const blankNode = n3_1.DataFactory.blankNode;
const defaultGraph = n3_1.DataFactory.defaultGraph;
const literal = n3_1.DataFactory.literal;
function addProvenanceGraphToStore(store, provenance, graph) {
    graph = graph || blankNode();
    store.addQuads(provenance.map(t => quad(t.subject, t.predicate, t.object, graph)));
    return { store, graph };
}
exports.addProvenanceGraphToStore = addProvenanceGraphToStore;
function createProvenanceTriples(provenanceInfo) {
    const { origin, issuer, target } = provenanceInfo;
    if (!origin && !issuer)
        return { subject: target, triples: [] };
    const timestamp = new Date().toISOString();
    const provenanceGraph = [];
    if (origin)
        provenanceGraph.push(quad(target, namedNode(util_1.PackOntology.origin), namedNode(origin)));
    if (issuer)
        provenanceGraph.push(quad(target, namedNode(util_1.PackOntology.issuer), namedNode(issuer)));
    provenanceGraph.push(quad(target, namedNode(util_1.PackOntology.timestamp), literal(timestamp, namedNode(vocab_common_rdf_1.XSD.dateTime))));
    return { subject: target, triples: provenanceGraph };
}
exports.createProvenanceTriples = createProvenanceTriples;
