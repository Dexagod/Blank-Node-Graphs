import { Quad_Graph, Store, Triple } from "n3"

// import { DataFactory } from "../index";
import { DataFactory } from "n3";
let bnCounter = 0

const quad = DataFactory.quad;
const namedNode = DataFactory.namedNode;
const blankNode = () => DataFactory.blankNode(`n3-p-${bnCounter+=1}}`);
const defaultGraph = DataFactory.defaultGraph;
const literal = DataFactory.literal;

export function addPolicyGraphToStore( store: Store, policy: Triple[], graph?: Quad_Graph) {
    
    // Create graph to store policy information
    graph = graph || blankNode();
    store.addQuads(policy.map(t => quad(t.subject, t.predicate, t.object, graph)))   

    return { graph, store };
}



