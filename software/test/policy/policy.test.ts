import { DataFactory, NamedNode, Store, Triple } from "n3";
import { ODRL, RDF, XSD } from "@inrupt/vocab-common-rdf";
import { createSimplePolicy } from "../../src/example/policy";
import { addPolicyGraphToStore } from "../../src/policy/policy"
import { parseTrigToStore, serializeTrigFromStore } from "../../src/util/trigUtils";
import { Quad_Subject } from "rdf-js";
import "jest-rdf";

const { namedNode, blankNode, literal, triple } = DataFactory;

jest.mock('../../src/util/util', () => ({
    generateUrnUuid: jest.fn(() => namedNode('urn:uuid:mock-uuid')),
}));

describe('createSimplePolicy', () => {
    it('should create a policy with no duration or purpose', () => {
        const target = namedNode("http://example.org/target");
        const result = createSimplePolicy({ target });

        expect(result.triples.length).toBe(6); // 2 for permission, 3 for agreement

        const agreementTerm = result.subject
        const permissionTerm = result.triples.filter(t => t.predicate.equals(namedNode(ODRL.permission)))[0].object as NamedNode

        const permissionTriples = result.triples.filter(triple => triple.subject.equals(permissionTerm));
        const agreementTriples = result.triples.filter(triple => triple.subject.equals(agreementTerm));

        expect(permissionTriples).toBeRdfIsomorphic([
            triple(permissionTerm, namedNode(ODRL.target), target),
            triple(permissionTerm, namedNode(ODRL.action), namedNode(ODRL.use)),
            triple(permissionTerm, namedNode(ODRL.action), namedNode(ODRL.read)),
        ]);

        expect(agreementTriples).toBeRdfIsomorphic([
            triple(agreementTerm, namedNode(RDF.type), namedNode(ODRL.Agreement)),
            triple(agreementTerm, namedNode(ODRL.uid), namedNode('urn:uuid:mock-uuid')),
            triple(agreementTerm, namedNode(ODRL.permission), permissionTerm)
        ]);
    });

    it('should create a policy with duration', () => {
        const target = namedNode("http://example.org/target");
        const duration = "P1Y";
        const result = createSimplePolicy({ target, duration });

        expect(result.triples.length).toBe(10); // 4 for constraint, 3 for permission, 3 for agreement

        const agreementTerm = result.subject
        const permissionTerm = result.triples.filter(t => t.predicate.equals(namedNode(ODRL.permission)))[0].object as NamedNode
        const constraintTerm = result.triples.filter(t => t.predicate.equals(namedNode(ODRL.constraint)))[0].object as NamedNode

        const constraintTriples = result.triples.filter(triple => triple.subject.equals(constraintTerm));
        const permissionTriples = result.triples.filter(triple => triple.subject.equals(permissionTerm));
        const agreementTriples = result.triples.filter(triple => triple.subject.equals(agreementTerm));

        expect(constraintTriples).toBeRdfIsomorphic([
            triple(constraintTerm, namedNode(ODRL.leftOperand), namedNode(ODRL.elapsedTime)),
            triple(constraintTerm, namedNode(ODRL.operator), namedNode(ODRL.eq)),
            triple(constraintTerm, namedNode(ODRL.rightOperand), literal(duration, namedNode(XSD.duration)))
        ]);

        expect(permissionTriples).toBeRdfIsomorphic([
            triple(permissionTerm, namedNode(ODRL.target), target),
            triple(permissionTerm, namedNode(ODRL.action), namedNode(ODRL.use)),
            triple(permissionTerm, namedNode(ODRL.action), namedNode(ODRL.read)),
            triple(permissionTerm, namedNode(ODRL.constraint), constraintTerm)
        ]);

        expect(agreementTriples).toBeRdfIsomorphic([
            triple(agreementTerm, namedNode(RDF.type), namedNode(ODRL.Agreement)),
            triple(agreementTerm, namedNode(ODRL.uid), namedNode('urn:uuid:mock-uuid')),
            triple(agreementTerm, namedNode(ODRL.permission), permissionTerm)
        ]);
    });

    it('should create a policy with purpose', () => {
        const target = namedNode("http://example.org/target");
        const purpose = "Research";
        const result = createSimplePolicy({ target, purpose });

        expect(result.triples.length).toBe(10); // 4 for constraint, 3 for permission, 3 for agreement

        const agreementTerm = result.subject
        const permissionTerm = result.triples.filter(t => t.predicate.equals(namedNode(ODRL.permission)))[0].object as NamedNode
        const constraintTerm = result.triples.filter(t => t.predicate.equals(namedNode(ODRL.constraint)))[0].object as NamedNode

        const constraintTriples = result.triples.filter(triple => triple.subject.equals(constraintTerm));
        const permissionTriples = result.triples.filter(triple => triple.subject.equals(permissionTerm));
        const agreementTriples = result.triples.filter(triple => triple.subject.equals(agreementTerm));


        expect(constraintTriples).toBeRdfIsomorphic([
            triple(constraintTerm, namedNode(ODRL.leftOperand), namedNode("https://w3id.org/oac#Purpose")),
            triple(constraintTerm, namedNode(ODRL.operator), namedNode(ODRL.eq)),
            triple(constraintTerm, namedNode(ODRL.rightOperand), literal(purpose))
        ]);

        expect(permissionTriples).toBeRdfIsomorphic([
            triple(permissionTerm, namedNode(ODRL.target), target),
            triple(permissionTerm, namedNode(ODRL.action), namedNode(ODRL.use)),
            triple(permissionTerm, namedNode(ODRL.action), namedNode(ODRL.read)),
            triple(permissionTerm, namedNode(ODRL.constraint), constraintTerm)
        ]);

        expect(agreementTriples).toBeRdfIsomorphic([
            triple(agreementTerm, namedNode(RDF.type), namedNode(ODRL.Agreement)),
            triple(agreementTerm, namedNode(ODRL.uid), namedNode('urn:uuid:mock-uuid')),
            triple(agreementTerm, namedNode(ODRL.permission), permissionTerm)
        ]);
    });

    it('should create a policy with assigner and assignee', () => {
        const target = namedNode("http://example.org/target");
        const assigner = namedNode("http://example.org/assigner");
        const assignee = namedNode("http://example.org/assignee");
        const result = createSimplePolicy({ target, assigner, assignee });

        expect(result.triples.length).toBe(8); // 3 for permission, 3 for agreement, 2 for assigner and assignee

        const agreementTerm = result.subject
        const permissionTerm = result.triples.filter(t => t.predicate.equals(namedNode(ODRL.permission)))[0].object as NamedNode

        const permissionTriples = result.triples.filter(triple => triple.subject.equals(permissionTerm));
        const agreementTriples = result.triples.filter(triple => triple.subject.equals(agreementTerm));

        expect(permissionTriples).toBeRdfIsomorphic([
            triple(permissionTerm, namedNode(ODRL.target), target),
            triple(permissionTerm, namedNode(ODRL.action), namedNode(ODRL.use)),
            triple(permissionTerm, namedNode(ODRL.action), namedNode(ODRL.read)),
            triple(permissionTerm, namedNode(ODRL.assigner), assigner),
            triple(permissionTerm, namedNode(ODRL.assignee), assignee),
        ]);

        expect(agreementTriples).toBeRdfIsomorphic([
            triple(agreementTerm, namedNode(RDF.type), namedNode(ODRL.Agreement)),
            triple(agreementTerm, namedNode(ODRL.uid), namedNode('urn:uuid:mock-uuid')),
            triple(agreementTerm, namedNode(ODRL.permission), permissionTerm)
        ]);
    });
});
