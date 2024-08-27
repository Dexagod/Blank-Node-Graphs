import { BlankNode, DataFactory, NamedNode, Quad_Graph, Quad_Object, Quad_Subject, Store, Triple } from "n3"
import { PackOntology } from "../util/util";
import { XSD } from "@inrupt/vocab-common-rdf";

const quad = DataFactory.quad;
const namedNode = DataFactory.namedNode;
const blankNode = DataFactory.blankNode;
const defaultGraph = DataFactory.defaultGraph;
const literal = DataFactory.literal;

export interface ProvenanceInfo {
    origin?: string, 
    issuer?: string,
    target: NamedNode | BlankNode
}

export function addProvenanceGraphToStore( store: Store, provenance: Triple[], graph?: Quad_Graph) {
    
    graph = graph || blankNode();
    store.addQuads(provenance.map(t => quad(t.subject, t.predicate, t.object, graph)))   

    return { store, graph };
}

export function createProvenanceTriples( provenanceInfo: ProvenanceInfo ){
    const { origin, issuer, target } = provenanceInfo
    if (!origin && !issuer) return { subject: target, triples: [] }

    const timestamp = new Date().toISOString()
    const provenanceGraph: Triple[] = []
    if (origin) provenanceGraph.push(quad(target, namedNode(PackOntology.origin), namedNode(origin)))
    if (issuer) provenanceGraph.push(quad(target, namedNode(PackOntology.issuer), namedNode(issuer)))
    provenanceGraph.push(quad(target, namedNode(PackOntology.timestamp), literal(timestamp, namedNode(XSD.dateTime))))

    return { subject: target, triples: provenanceGraph }
}



