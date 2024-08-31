import { BlankNode, DataFactory, NamedNode, Store, Triple } from "n3";
import { ODRL, RDF, XSD } from "@inrupt/vocab-common-rdf";
import { createSimplePolicy } from "../../src/example/policy";
import "jest-rdf";

const { namedNode, blankNode, literal, triple } = DataFactory;

describe('createSimplePolicy', () => {

    // beforeEach(() => {
    //     jest.mock('../../src/util/util', () => ({
    //         generateUrnUuid: jest.fn(() => namedNode('urn:uuid:mock-uuid')),
    //         ...jest.requireActual('../../src/util/util'),
    //     }));
    // })

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
            triple(agreementTerm, namedNode(ODRL.uid), agreementTriples?.filter(q => q.predicate.value === ODRL.uid)[0].object),
            triple(agreementTerm, namedNode(ODRL.permission), permissionTerm)
        ]);
    });

    it('should create a policy with duration', () => {
        const target = namedNode("http://example.org/target");
        const duration = "P1Y";
        const result = createSimplePolicy({ target, duration });

        expect(result.triples.length).toBe(11); // 4 for constraint, 4 for permission, 3 for agreement

        const agreementTerm = result.subject
        const permissionTerm = result.triples.filter(t => t.predicate.equals(namedNode(ODRL.permission)))[0].object as NamedNode
        const constraintTerm = result.triples.filter(t => t.predicate.equals(namedNode(ODRL.constraint)))[0].object as NamedNode

        const constraintTriples = result.triples.filter(triple => triple.subject.equals(constraintTerm));
        const permissionTriples = result.triples.filter(triple => triple.subject.equals(permissionTerm));
        const agreementTriples = result.triples.filter(triple => triple.subject.equals(agreementTerm));

        // cheating to find the given date, saves a mock implementation
        const dateTime = constraintTriples.filter(triple => 
                triple.subject.equals(constraintTerm) && triple.predicate.equals(namedNode(ODRL.rightOperand))
            )[0].object

        expect(constraintTriples).toBeRdfIsomorphic([
            triple(constraintTerm, namedNode(RDF.type), namedNode(ODRL.Constraint)),
            triple(constraintTerm, namedNode(ODRL.leftOperand), namedNode(ODRL.dateTime)),
            triple(constraintTerm, namedNode(ODRL.operator), namedNode(ODRL.lt)),
            triple(constraintTerm, namedNode(ODRL.rightOperand), dateTime)
        ]);

        expect(permissionTriples).toBeRdfIsomorphic([
            triple(permissionTerm, namedNode(ODRL.target), target),
            triple(permissionTerm, namedNode(ODRL.action), namedNode(ODRL.use)),
            triple(permissionTerm, namedNode(ODRL.action), namedNode(ODRL.read)),
            triple(permissionTerm, namedNode(ODRL.constraint), constraintTerm)
        ]);

        expect(agreementTriples).toBeRdfIsomorphic([
            triple(agreementTerm, namedNode(RDF.type), namedNode(ODRL.Agreement)),
            triple(agreementTerm, namedNode(ODRL.uid), agreementTriples?.filter(q => q.predicate.value === ODRL.uid)[0].object),
            triple(agreementTerm, namedNode(ODRL.permission), permissionTerm)
        ]);
    });

    it('should create a policy with purpose', () => {
        const target = namedNode("http://example.org/target");
        const purpose = "http://example.org/ns/terms/Research";
        const result = createSimplePolicy({ target, purpose: [ purpose ] });

        expect(result.triples.length).toBe(11); // 4 for purpose constraint, 4 for permission, 3 for agreement

        const agreementTerm = result.subject
        const permissionTerm = result.triples.filter(t => t.predicate.equals(namedNode(ODRL.permission)))[0].object as NamedNode
        const constraintTerm = result.triples.filter(t => t.predicate.equals(namedNode(ODRL.constraint)))[0].object as NamedNode

        const constraintTriples = result.triples.filter(triple => triple.subject.equals(constraintTerm));
        const permissionTriples = result.triples.filter(triple => triple.subject.equals(permissionTerm));
        const agreementTriples = result.triples.filter(triple => triple.subject.equals(agreementTerm));


        expect(constraintTriples).toBeRdfIsomorphic([
            triple(constraintTerm, namedNode(RDF.type), namedNode(ODRL.Constraint)),
            triple(constraintTerm, namedNode(ODRL.leftOperand), namedNode("https://w3id.org/oac#Purpose")),
            triple(constraintTerm, namedNode(ODRL.operator), namedNode(ODRL.eq)),
            triple(constraintTerm, namedNode(ODRL.rightOperand), namedNode(purpose))
        ]);

        expect(permissionTriples).toBeRdfIsomorphic([
            triple(permissionTerm, namedNode(ODRL.target), target),
            triple(permissionTerm, namedNode(ODRL.action), namedNode(ODRL.use)),
            triple(permissionTerm, namedNode(ODRL.action), namedNode(ODRL.read)),
            triple(permissionTerm, namedNode(ODRL.constraint), constraintTerm)
        ]);

        expect(agreementTriples).toBeRdfIsomorphic([
            triple(agreementTerm, namedNode(RDF.type), namedNode(ODRL.Agreement)),
            triple(agreementTerm, namedNode(ODRL.uid), agreementTriples?.filter(q => q.predicate.value === ODRL.uid)[0].object),
            triple(agreementTerm, namedNode(ODRL.permission), permissionTerm)
        ]);
    });

    it('should create a policy with assigner and assignee', () => {
        const target = namedNode("http://example.org/target");
        const assigner = "http://example.org/assigner";
        const assignee = "http://example.org/assignee";
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
            triple(permissionTerm, namedNode(ODRL.assigner), namedNode(assigner)),
            triple(permissionTerm, namedNode(ODRL.assignee), namedNode(assignee)),
        ]);

        expect(agreementTriples).toBeRdfIsomorphic([
            triple(agreementTerm, namedNode(RDF.type), namedNode(ODRL.Agreement)),
            triple(agreementTerm, namedNode(ODRL.uid), agreementTriples?.filter(q => q.predicate.value === ODRL.uid)[0].object),
            triple(agreementTerm, namedNode(ODRL.permission), permissionTerm)
        ]);
    });


    it('should create a policy with multiple purposes', () => {
        const target = namedNode("http://example.org/target");
        const purpose = [ "http://example.org/ns/terms/purpose1", "http://example.org/ns/terms/purpose2" ];
        const result = createSimplePolicy({ target, purpose: purpose });

        expect(result.triples.length).toBe(20); // 4 for purpose1, 4 for purpose 2, 4 for list of 2 items, 1 for or , 4 for permission, 3 for agreement

        const s = new Store()
        s.addQuads(result.triples)

        const agreementTerm = result.subject
        const permissionTerm = result.triples.filter(t => t.predicate.equals(namedNode(ODRL.permission)))[0].object as NamedNode | BlankNode
        const permissionConstraintTerms = result.triples.filter(t => t.object.equals(namedNode(ODRL.Constraint))).map(q => q.object) as (NamedNode | BlankNode)[]

        const permissionTriples = result.triples.filter(triple => triple.subject.equals(permissionTerm));
        const agreementTriples = result.triples.filter(triple => triple.subject.equals(agreementTerm));

        for (let constraintTerm of permissionConstraintTerms) {
            // assert it is part of a list
            expect(s.getQuads(null, namedNode(RDF.first), constraintTerm, null)).toHaveLength(1) 
            // assert it exists as a constraint
            expect(s.getQuads(constraintTerm, namedNode(RDF.type), namedNode(ODRL.Constraint), null)).toHaveLength(1) 
        }

        // OR because the base of the purposes is an OR  
        expect(s.getQuads(null, namedNode(ODRL.or), null, null)).toHaveLength(1)
        const constraintBase = s.getQuads(null, namedNode(ODRL.or), null, null)[0].subject

        expect(permissionTriples).toBeRdfIsomorphic([
            triple(permissionTerm, namedNode(ODRL.target), target),
            triple(permissionTerm, namedNode(ODRL.action), namedNode(ODRL.use)),
            triple(permissionTerm, namedNode(ODRL.action), namedNode(ODRL.read)),
            triple(permissionTerm, namedNode(ODRL.constraint), constraintBase)
        ]);

        expect(agreementTriples).toBeRdfIsomorphic([
            triple(agreementTerm, namedNode(RDF.type), namedNode(ODRL.Agreement)),
            triple(agreementTerm, namedNode(ODRL.uid), agreementTriples?.filter(q => q.predicate.value === ODRL.uid)[0].object),
            triple(agreementTerm, namedNode(ODRL.permission), permissionTerm)
        ]);
    });

    it('should create a policy with multiple purposes and a duration', () => {
        const target = namedNode("http://example.org/target");
        const purpose = [ "http://example.org/ns/terms/purpose1", "http://example.org/ns/terms/purpose2" ];
        const duration = "P1M"
        const result = createSimplePolicy({ target, purpose: purpose, duration });

        const s = new Store();
        s.addQuads(result.triples)

        /**
         * 4 for purpose1
         * 4 for purpose2
         * 4 for list of 2 purpose items
         * 1 for or 
         * 4 for duration
         * 4 for list of purpose list base and duration
         * 1 for and
         * 4 for permission
         * 3 for agreement
         * = 29
         */
        expect(result.triples.length).toBe(29); 

        const agreementTerm = result.subject
        const permissionTerm = result.triples.filter(t => t.predicate.equals(namedNode(ODRL.permission)))[0].object as NamedNode | BlankNode
        const permissionConstraintTerms = result.triples.filter(t => t.object.equals(namedNode(ODRL.purpose))).map(q => q.subject) as (NamedNode | BlankNode)[]
        const durationConstraintTerm = result.triples.filter(t => t.object.equals(namedNode(ODRL.dateTime)))[0].subject as (NamedNode | BlankNode)
        const permissionTriples = result.triples.filter(triple => triple.subject.equals(permissionTerm));
        const agreementTriples = result.triples.filter(triple => triple.subject.equals(agreementTerm));


        for (let constraintTerm of permissionConstraintTerms) {
            console.log(constraintTerm)
            // assert it is part of a list
            expect(s.getQuads(null, namedNode(RDF.first), constraintTerm, null)).toHaveLength(1) 
            // assert it exists as a constraint
            expect(s.getQuads(constraintTerm, namedNode(RDF.type), namedNode(ODRL.Constraint), null)).toHaveLength(1) 
        }

        expect(s.getQuads(null, namedNode(ODRL.or), null, null)).toHaveLength(1)
        const orConstraintBase = s.getQuads(null, namedNode(ODRL.or), null, null)[0].subject

        expect(s.getQuads(null, namedNode(RDF.first), orConstraintBase, null)).toHaveLength(1) 
        expect(s.getQuads(null, namedNode(RDF.first), durationConstraintTerm, null)).toHaveLength(1) 


        // AND because the combination of the possible purposes and the duration is an AND requirement 
        expect(s.getQuads(null, namedNode(ODRL.and), null, null)).toHaveLength(1)
        const constraintBase = s.getQuads(null, namedNode(ODRL.and), null, null)[0].subject

        expect(permissionTriples).toBeRdfIsomorphic([
            triple(permissionTerm, namedNode(ODRL.target), target),
            triple(permissionTerm, namedNode(ODRL.action), namedNode(ODRL.use)),
            triple(permissionTerm, namedNode(ODRL.action), namedNode(ODRL.read)),
            triple(permissionTerm, namedNode(ODRL.constraint), constraintBase)
        ]);

        expect(agreementTriples).toBeRdfIsomorphic([
            triple(agreementTerm, namedNode(RDF.type), namedNode(ODRL.Agreement)),
            triple(agreementTerm, namedNode(ODRL.uid), agreementTriples?.filter(q => q.predicate.value === ODRL.uid)[0].object),
            triple(agreementTerm, namedNode(ODRL.permission), permissionTerm)
        ]);
    });

});
