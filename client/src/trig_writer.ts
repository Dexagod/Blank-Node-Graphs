import { Quad_Object, Store } from "n3"
import { serializeTrigFromStore, createRDFList, DataFactory } from "../../software/src"

const { quad, namedNode, blankNode, literal } = DataFactory

const g1 = blankNode('g1')
const g2 = blankNode('g2')

const l1 = createRDFList([literal('a'), literal('b'), literal('c')], g1)

const l2 = createRDFList([namedNode("a"), namedNode("b")])




const quads = [
    ...l1.quads, 
    ...l2.quads,
    quad(blankNode(), namedNode('predicate'), blankNode(), g2),
    quad(blankNode(), namedNode('predicate2'), l1.subject as Quad_Object, g2),
    quad(blankNode(), namedNode('predicate3'), l2.subject as Quad_Object)
]

serializeTrigFromStore(new Store(quads), true).then(console.log)


