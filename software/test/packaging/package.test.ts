import { createDatasetFromGraphsInStore, renameGraph } from "../../src/package/package";
import { Store } from "n3";
import { DataFactory } from "../../../software/src/";
import { RDF } from "@inrupt/vocab-common-rdf";
import { } from "jest"
import { PackOntology } from "../../src";
require('jest-rdf');


const { namedNode, blankNode, defaultGraph, quad } = DataFactory;

describe('createDatasetFromGraphsInStore', () => {
    let store: Store;

    beforeEach(() => {
        store = new Store();
    });

    it('should add dataset triples to the store', () => {
        const graphTerms = [namedNode("http://example.org/graph1"), namedNode("http://example.org/graph2")];
        const updatedStore = createDatasetFromGraphsInStore(store, graphTerms).store;

        expect(updatedStore.size).toBe(3); // 1 RDF.type quad + 2 RDFContains quads

        const quads = updatedStore.getQuads(null, null, null, null);
        const datasetSubject = quads[0].subject;

        expect(quads).toEqual(expect.arrayContaining([
            quad(datasetSubject, namedNode(RDF.type), namedNode(PackOntology.Dataset), defaultGraph()),
            quad(datasetSubject, namedNode(PackOntology.contains), graphTerms[0], defaultGraph()),
            quad(datasetSubject, namedNode(PackOntology.contains), graphTerms[1], defaultGraph())
        ]));
    });

    it('should throw an error if default graph is included in graph terms', () => {
        const graphTerms = [defaultGraph()];

        expect(() => createDatasetFromGraphsInStore(store, graphTerms)).toThrow(
            'Error creating dataset from graphs: cannot reference the default graph in local scope. Please rename the default graph first.'
        );
    });

    it('should use metadataGraph if provided', () => {
        const graphTerms = [namedNode("http://example.org/graph1")];
        const metadataGraph = namedNode("http://example.org/metadataGraph");
        const updatedStore = createDatasetFromGraphsInStore(store, graphTerms, metadataGraph).store;

        expect(updatedStore.size).toBe(2);

        const quads = updatedStore.getQuads(null, null, null, metadataGraph);

        const datasetSubject = quads[0].subject;

        expect(quads).toEqual(expect.arrayContaining([
            quad(datasetSubject, namedNode(RDF.type), namedNode(PackOntology.Dataset), metadataGraph),
            quad(datasetSubject, namedNode(PackOntology.contains), graphTerms[0], metadataGraph)
        ]));
    });
});

describe('renameGraph', () => {
    let store: Store;

    beforeEach(() => {
        store = new Store();
    });

    it('should rename graph and keep original if retainOriginal is true', () => {
        const sourceGraph = namedNode("http://example.org/sourceGraph");
        const targetGraph = namedNode("http://example.org/targetGraph");

        const quad1 = quad(namedNode("http://example.org/subject1"), namedNode("http://example.org/predicate1"), namedNode("http://example.org/object1"), sourceGraph);
        store.addQuad(quad1);

        const result = renameGraph(store, sourceGraph, targetGraph, true);

        expect(result.store.size).toBe(2); // both original and renamed quads should be in store
        expect(result.store.getQuads(null, null, null, sourceGraph)).toHaveLength(1);
        expect(result.store.getQuads(null, null, null, targetGraph)).toHaveLength(1);
    });

    it('should rename graph and remove original if retainOriginal is false', () => {
        const sourceGraph = namedNode("http://example.org/sourceGraph");
        const targetGraph = namedNode("http://example.org/targetGraph");

        const quad1 = quad(namedNode("http://example.org/subject1"), namedNode("http://example.org/predicate1"), namedNode("http://example.org/object1"), sourceGraph);
        store.addQuad(quad1);

        const result = renameGraph(store, sourceGraph, targetGraph, false);

        expect(result.store.size).toBe(1); // only the renamed quad should be in store
        expect(result.store.getQuads(null, null, null, sourceGraph)).toHaveLength(0);
        expect(result.store.getQuads(null, null, null, targetGraph)).toHaveLength(1);
    });

    it('should rename graph to a blank node if target is not provided', () => {
        const sourceGraph = namedNode("http://example.org/sourceGraph");

        const quad1 = quad(namedNode("http://example.org/subject1"), namedNode("http://example.org/predicate1"), namedNode("http://example.org/object1"), sourceGraph);
        store.addQuad(quad1);

        const result = renameGraph(store, sourceGraph);
        expect(result.store.size).toBe(1); // only the renamed quad should be in store
        const renamedQuad = result.store.getQuads(null, null, null, result.graph);
        expect(renamedQuad).toHaveLength(1);
        expect(result.graph.termType).toBe('BlankNode');
    });
});


