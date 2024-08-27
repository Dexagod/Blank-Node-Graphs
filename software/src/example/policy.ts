import { DataFactory, Quad_Object, Quad_Subject, Triple } from "n3"
import { ODRL, RDF, XSD } from "@inrupt/vocab-common-rdf";
import { generateUrnUuid } from "../util/util";
import moment from "moment";

const { namedNode, blankNode, literal, quad, defaultGraph, triple } = DataFactory;

/**
 * Create simple policy managing duration and purpose requirements for contained data
 * 
 * @param policyOptions 
 * @returns 
 */
export function createSimplePolicy(
    policyOptions: { 
        target: Quad_Object, 
        assigner?: string, 
        assignee?: string, 
        duration?: string, 
        purpose?: string
    }) : { subject: Quad_Subject, triples: Triple[] } {
  
    const {target, duration, purpose, assigner, assignee} = policyOptions;
    
    // Create graph to store policy information
    let policyGraph: Triple[] = []

    const constraints: Quad_Subject[] = []

    // Add duration constraint
    if (duration) {

        const m = moment()
        m.add(duration)
        const endDate = m.toISOString()
        const constraintSubject = blankNode()
        // policyGraph = policyGraph.concat([
        //     quad(constraintSubject, namedNode(ODRL.leftOperand), namedNode(ODRL.elapsedTime)),
        //     quad(constraintSubject, namedNode(ODRL.operator), namedNode(ODRL.eq)),
        //     quad(constraintSubject, namedNode(ODRL.rightOperand), literal(duration, namedNode(XSD.duration)))
        // ])
        policyGraph = policyGraph.concat([
            quad(constraintSubject, namedNode(ODRL.leftOperand), namedNode(ODRL.dateTime)),
            quad(constraintSubject, namedNode(ODRL.operator), namedNode(ODRL.lt)),
            quad(constraintSubject, namedNode(ODRL.rightOperand), literal(endDate, namedNode(XSD.dateTime)))
        ])
        constraints.push(constraintSubject)
    }
    
    // Add purpose constraint
    if (purpose) {
        const constraintSubject = blankNode()
        policyGraph = policyGraph.concat([
            quad(constraintSubject, namedNode(ODRL.leftOperand), namedNode("https://w3id.org/oac#Purpose")),
            quad(constraintSubject, namedNode(ODRL.operator), namedNode(ODRL.eq)),
            quad(constraintSubject, namedNode(ODRL.rightOperand), namedNode(purpose))
        ])
        constraints.push(constraintSubject)
    }
    
    // Create Permission
    const permissionSubject = blankNode();
    policyGraph.push(quad(permissionSubject, namedNode(ODRL.target), target))
    policyGraph.push(quad(permissionSubject, namedNode(ODRL.action), namedNode(ODRL.use)))
    policyGraph.push(quad(permissionSubject, namedNode(ODRL.action), namedNode(ODRL.read)))
    if (assigner) policyGraph.push(quad(permissionSubject, namedNode(ODRL.assigner), namedNode(assigner)))
    if (assignee) policyGraph.push(quad(permissionSubject, namedNode(ODRL.assignee), namedNode(assignee)))
        
    if (constraints.length) {
        for (const constraintIdentifier of constraints) {
            policyGraph.push(quad(permissionSubject, namedNode(ODRL.constraint), constraintIdentifier))
        }
    }

    // Create Agreement
    const agreementSubject = blankNode()
    policyGraph.push(quad(agreementSubject, namedNode(RDF.type), namedNode(ODRL.Agreement)))
    policyGraph.push(quad(agreementSubject, namedNode(ODRL.uid), generateUrnUuid()))
    policyGraph.push(quad(agreementSubject, namedNode(ODRL.permission), permissionSubject))


    return { subject: agreementSubject, triples: policyGraph }
}

