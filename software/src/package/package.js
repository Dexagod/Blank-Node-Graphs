"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renameGraph = exports.createDatasetFromGraphsInStore = void 0;
const n3_1 = require("n3");
const util_1 = require("../util/util");
const vocab_common_rdf_1 = require("@inrupt/vocab-common-rdf");
const { namedNode, blankNode, literal, quad, defaultGraph, triple } = n3_1.DataFactory;
/**
 * This function adds the dataset triples in the default graph to the store, and returns the updated store.
 * This changes the store passed as argument, so in case this one should not be changed, clone the store object before calling the function.
 * @param graphTerms term of the graph (blank node or named node) that need to be added as contained by the dataset
 * @param store quad store
 * @returns
 */
function createDatasetFromGraphsInStore(store, graphTerms, metadataGraph) {
    const datasetSubject = blankNode();
    const containingGraphTerm = metadataGraph ? namedNode(metadataGraph.value) : defaultGraph();
    const datasetQuads = [
        quad(datasetSubject, namedNode(vocab_common_rdf_1.RDF.type), namedNode(util_1.PackOntology.Dataset), containingGraphTerm)
    ];
    for (let graphTerm of graphTerms) {
        if (graphTerm.equals(defaultGraph())) {
            throw new Error('Error creating dataset from graphs: cannot reference the default graph in local scope. Please rename the default graph first.');
        }
        datasetQuads.push(quad(datasetSubject, namedNode(util_1.PackOntology.contains), graphTerm, containingGraphTerm));
    }
    store.addQuads(datasetQuads);
    return { store, graph: containingGraphTerm, id: datasetSubject };
}
exports.createDatasetFromGraphsInStore = createDatasetFromGraphsInStore;
/**
 * renames graph for all quads containing the graph as the graph name, as well as all quads containing the graph as a subject or object value
 * @param store
 * @param source
 * @param target
 * @param retainOriginal
 * @returns
 */
function renameGraph(store, source, target, retainOriginal) {
    target = target || blankNode();
    retainOriginal = !!retainOriginal;
    // rename graph at graph position
    const matchingQuads = store.match(null, null, null, source);
    for (const matchedQuad of matchingQuads) {
        store.addQuad(quad(matchedQuad.subject, matchedQuad.predicate, matchedQuad.object, target));
        if (!retainOriginal)
            store.removeQuad(matchedQuad);
    }
    // rename graph at object position
    const matchingQuads2 = store.match(null, null, source, null);
    for (const matchedQuad of matchingQuads2) {
        store.addQuad(quad(matchedQuad.subject, matchedQuad.predicate, target, matchedQuad.graph));
        if (!retainOriginal)
            store.removeQuad(matchedQuad);
    }
    // rename graph at subject position
    const matchingQuads3 = store.match(source, null, null, null);
    for (const matchedQuad of matchingQuads3) {
        store.addQuad(quad(target, matchedQuad.predicate, matchedQuad.object, matchedQuad.graph));
        if (!retainOriginal)
            store.removeQuad(matchedQuad);
    }
    return { store, graph: target };
}
exports.renameGraph = renameGraph;
