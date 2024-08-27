import { DataFactory, Store, Triple, Quad_Graph } from "n3";
import { addProvenanceGraphToStore, createProvenanceTriples, ProvenanceInfo } from "../../src/provenance/provenance";
import { PackOntology } from "../../src/util/util";
import "jest-rdf";
import { Quad_Object } from "rdf-js";

const { namedNode, blankNode, quad, triple } = DataFactory;

describe('addProvenanceGraphToStore', () => {
    let store: Store;

    beforeAll(() => {
        const date = new Date()
        jest.useFakeTimers();
        jest.setSystemTime(date);
    });
    
    afterAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        store = new Store();
    });

    it('should add provenance triples to the store with a blank node graph if no graph is provided', () => {
        const provenance: Triple[] = [
            triple(namedNode("http://example.org/subject1"), namedNode("http://example.org/predicate1"), namedNode("http://example.org/object1")),
            triple(namedNode("http://example.org/subject2"), namedNode("http://example.org/predicate2"), namedNode("http://example.org/object2"))
        ];

        let graph;
        ({ store, graph} = addProvenanceGraphToStore(store, provenance)) ;
        const quadsInStore = store.getQuads(null, null, null, null);

        expect(quadsInStore).toHaveLength(provenance.length);

        provenance.forEach(triple => {
            expect(store.getQuads(triple.subject, triple.predicate, triple.object, graph)).toHaveLength(1)
        });
    });

    it('should add provenance triples to the store with the provided graph', () => {
        let graph: Quad_Graph = namedNode("http://example.org/graph");
        const provenance: Triple[] = [
            quad(namedNode("http://example.org/subject1"), namedNode("http://example.org/predicate1"), namedNode("http://example.org/object1")),
            quad(namedNode("http://example.org/subject2"), namedNode("http://example.org/predicate2"), namedNode("http://example.org/object2"))
        ];

        ({ store, graph} = addProvenanceGraphToStore(store, provenance, graph)) ;
        const quadsInStore = store.getQuads(null, null, null, graph);

        expect(quadsInStore).toHaveLength(provenance.length);

        provenance.forEach(triple => {
            expect(store.getQuads(triple.subject, triple.predicate, triple.object, graph)).toHaveLength(1)
        });
    });

    it('should add provenance triples to the default graph when DataFactory.defaultGraph() is provided as graph explicitly', () => {
        let graph: Quad_Graph = DataFactory.defaultGraph()
        const provenance: Triple[] = [
            quad(namedNode("http://example.org/subject1"), namedNode("http://example.org/predicate1"), namedNode("http://example.org/object1")),
            quad(namedNode("http://example.org/subject2"), namedNode("http://example.org/predicate2"), namedNode("http://example.org/object2"))
        ];

        ({ store, graph} = addProvenanceGraphToStore(store, provenance, graph)) ;
        const quadsInStore = store.getQuads(null, null, null, graph);

        expect(quadsInStore).toHaveLength(provenance.length);

        provenance.forEach(triple => {
            expect(store.getQuads(triple.subject, triple.predicate, triple.object, DataFactory.defaultGraph())).toHaveLength(1)
        });
    });
});

describe('createProvenanceTriples', () => {
    it('should return an empty array if neither origin nor issuer are provided', () => {
        const provenanceInfo: ProvenanceInfo = {
            target: namedNode("http://example.org/target")
        };
        const result = createProvenanceTriples(provenanceInfo);
        expect(result.triples).toHaveLength(0);
    });

    it('should create provenance triples with origin', () => {
        const provenanceInfo: ProvenanceInfo = {
            target: namedNode("http://example.org/target"),
            origin: "http://example.org/origin"
        };
        const result = createProvenanceTriples(provenanceInfo);
        const endDate = result.triples.find(t => t.predicate.equals(namedNode(PackOntology.timestamp)))?.object

        expect(result.triples).toBeRdfIsomorphic([
            quad(provenanceInfo.target, namedNode(PackOntology.origin), namedNode(provenanceInfo.origin!)),
            quad(provenanceInfo.target, namedNode(PackOntology.timestamp), endDate as Quad_Object)
        ]);
    });

    it('should create provenance triples with issuer', () => {
        const provenanceInfo: ProvenanceInfo = {
            target: namedNode("http://example.org/target"),
            issuer: "http://example.org/issuer"
        };
        const result = createProvenanceTriples(provenanceInfo);
        const endDate = result.triples.find(t => t.predicate.equals(namedNode(PackOntology.timestamp)))?.object

        expect(result.triples).toBeRdfIsomorphic([
            quad(provenanceInfo.target, namedNode(PackOntology.issuer), namedNode(provenanceInfo.issuer!)),
            quad(provenanceInfo.target, namedNode(PackOntology.timestamp), endDate as Quad_Object)
        ]);
    });

    it('should create provenance triples with both origin and issuer', () => {
        const provenanceInfo: ProvenanceInfo = {
            target: namedNode("http://example.org/target"),
            origin: "http://example.org/origin",
            issuer: "http://example.org/issuer"
        };
        const result = createProvenanceTriples(provenanceInfo);
        const endDate = result.triples.find(t => t.predicate.equals(namedNode(PackOntology.timestamp)))?.object

        expect(result.triples).toBeRdfIsomorphic([
            quad(provenanceInfo.target, namedNode(PackOntology.origin), namedNode(provenanceInfo.origin!)),
            quad(provenanceInfo.target, namedNode(PackOntology.issuer), namedNode(provenanceInfo.issuer!)),
            quad(provenanceInfo.target, namedNode(PackOntology.timestamp), endDate as Quad_Object)
        ]);
    });
});
