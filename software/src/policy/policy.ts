import { DataFactory, Quad_Graph, Store, Triple } from "n3"

const quad = DataFactory.quad;
const namedNode = DataFactory.namedNode;
const blankNode = DataFactory.blankNode;
const defaultGraph = DataFactory.defaultGraph;
const literal = DataFactory.literal;

export function addPolicyGraphToStore( store: Store, policy: Triple[], graph?: Quad_Graph) {
    
    // Create graph to store policy information
    graph = graph || blankNode();
    store.addQuads(policy.map(t => quad(t.subject, t.predicate, t.object, graph)))   

    return { graph, store };
}



