"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSimplePolicy = void 0;
const n3_1 = require("n3");
const vocab_common_rdf_1 = require("@inrupt/vocab-common-rdf");
const util_1 = require("../util/util");
const moment_1 = __importDefault(require("moment"));
const { namedNode, blankNode, literal, quad, defaultGraph, triple } = n3_1.DataFactory;
/**
 * Create simple policy managing duration and purpose requirements for contained data
 *
 * @param policyOptions
 * @returns
 */
function createSimplePolicy(policyOptions) {
    const { target, duration, purpose, assigner, assignee } = policyOptions;
    // Create graph to store policy information
    let policyGraph = [];
    const constraints = [];
    // Add duration constraint
    if (duration) {
        const m = (0, moment_1.default)();
        m.add(duration);
        const endDate = m.toISOString();
        const constraintSubject = blankNode();
        // policyGraph = policyGraph.concat([
        //     quad(constraintSubject, namedNode(ODRL.leftOperand), namedNode(ODRL.elapsedTime)),
        //     quad(constraintSubject, namedNode(ODRL.operator), namedNode(ODRL.eq)),
        //     quad(constraintSubject, namedNode(ODRL.rightOperand), literal(duration, namedNode(XSD.duration)))
        // ])
        policyGraph = policyGraph.concat([
            quad(constraintSubject, namedNode(vocab_common_rdf_1.RDF.type), namedNode(vocab_common_rdf_1.ODRL.Constraint)),
            quad(constraintSubject, namedNode(vocab_common_rdf_1.ODRL.leftOperand), namedNode(vocab_common_rdf_1.ODRL.dateTime)),
            quad(constraintSubject, namedNode(vocab_common_rdf_1.ODRL.operator), namedNode(vocab_common_rdf_1.ODRL.lt)),
            quad(constraintSubject, namedNode(vocab_common_rdf_1.ODRL.rightOperand), literal(endDate, namedNode(vocab_common_rdf_1.XSD.dateTime)))
        ]);
        constraints.push(constraintSubject);
    }
    // Add purpose constraint
    if (purpose && purpose.length) {
        const constraintSubject = blankNode();
        if (purpose.length === 1) {
            policyGraph = policyGraph.concat([
                quad(constraintSubject, namedNode(vocab_common_rdf_1.RDF.type), namedNode(vocab_common_rdf_1.ODRL.Constraint)),
                quad(constraintSubject, namedNode(vocab_common_rdf_1.ODRL.leftOperand), namedNode("https://w3id.org/oac#Purpose")),
                quad(constraintSubject, namedNode(vocab_common_rdf_1.ODRL.operator), namedNode(vocab_common_rdf_1.ODRL.eq)),
                quad(constraintSubject, namedNode(vocab_common_rdf_1.ODRL.rightOperand), namedNode(purpose[0]))
            ]);
        }
        else {
            const purposeConstraints = [];
            // create list of constraints
            for (let specificPurpose of purpose) {
                let purposeConstraintSubj = blankNode();
                policyGraph = policyGraph.concat([
                    quad(purposeConstraintSubj, namedNode(vocab_common_rdf_1.RDF.type), namedNode(vocab_common_rdf_1.ODRL.constraint)),
                    quad(purposeConstraintSubj, namedNode(vocab_common_rdf_1.ODRL.leftOperand), namedNode("https://w3id.org/oac#Purpose")),
                    quad(purposeConstraintSubj, namedNode(vocab_common_rdf_1.ODRL.operator), namedNode(vocab_common_rdf_1.ODRL.eq)),
                    quad(purposeConstraintSubj, namedNode(vocab_common_rdf_1.ODRL.rightOperand), namedNode(specificPurpose))
                ]);
                purposeConstraints.push(purposeConstraintSubj);
            }
            // create list of purpose constraints
            const purposeConstraintsList = (0, util_1.createRDFList)(purposeConstraints);
            if (!purposeConstraintsList.subject)
                throw new Error('Cannot create empty list of purposes.');
            // add list to graph
            policyGraph = policyGraph.concat(purposeConstraintsList.quads);
            // define list as OR
            policyGraph.push(quad(constraintSubject, namedNode(vocab_common_rdf_1.ODRL.or), purposeConstraintsList.subject));
        }
        constraints.push(constraintSubject);
    }
    // Create Permission
    const permissionSubject = blankNode();
    policyGraph.push(quad(permissionSubject, namedNode(vocab_common_rdf_1.ODRL.target), target));
    policyGraph.push(quad(permissionSubject, namedNode(vocab_common_rdf_1.ODRL.action), namedNode(vocab_common_rdf_1.ODRL.use)));
    policyGraph.push(quad(permissionSubject, namedNode(vocab_common_rdf_1.ODRL.action), namedNode(vocab_common_rdf_1.ODRL.read)));
    if (assigner)
        policyGraph.push(quad(permissionSubject, namedNode(vocab_common_rdf_1.ODRL.assigner), namedNode(assigner)));
    if (assignee)
        policyGraph.push(quad(permissionSubject, namedNode(vocab_common_rdf_1.ODRL.assignee), namedNode(assignee)));
    // append constraints to permission
    if (constraints.length) {
        if (constraints.length > 1) {
            const constraintAndSubject = blankNode();
            const constraintList = (0, util_1.createRDFList)(constraints);
            if (!constraintList.subject)
                throw new Error('Cannot create empty list of purposes.');
            // add list to graph
            policyGraph = policyGraph.concat(constraintList.quads);
            // define list as OR
            policyGraph.push(quad(constraintAndSubject, namedNode(vocab_common_rdf_1.ODRL.and), constraintList.subject));
            policyGraph.push(quad(permissionSubject, namedNode(vocab_common_rdf_1.ODRL.constraint), constraintAndSubject));
        }
        else {
            policyGraph.push(quad(permissionSubject, namedNode(vocab_common_rdf_1.ODRL.constraint), constraints[0]));
        }
    }
    // Create Agreement
    const agreementSubject = blankNode();
    policyGraph.push(quad(agreementSubject, namedNode(vocab_common_rdf_1.RDF.type), namedNode(vocab_common_rdf_1.ODRL.Agreement)));
    policyGraph.push(quad(agreementSubject, namedNode(vocab_common_rdf_1.ODRL.uid), (0, util_1.generateUrnUuid)()));
    policyGraph.push(quad(agreementSubject, namedNode(vocab_common_rdf_1.ODRL.permission), permissionSubject));
    return { subject: agreementSubject, triples: policyGraph };
}
exports.createSimplePolicy = createSimplePolicy;
