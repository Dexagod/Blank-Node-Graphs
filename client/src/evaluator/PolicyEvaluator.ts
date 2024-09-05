import { Quad_Subject, Store } from "n3";
import { XSD, RDF, ODRL } from "@inrupt/vocab-common-rdf";

import { DataFactory, parseTrigToStore, serializeTrigFromStore, unpackRDFList } from "../../../software/src";
import { log } from "winston";
const { namedNode, blankNode, literal, quad } = DataFactory
export const PURPOSE = "https://w3id.org/oac#Purpose"

export type ConstraintEvaluation = {
    status: boolean,
    and?: ConstraintEvaluation[],
    or?: ConstraintEvaluation[],
    left?: string,
    op?: string,
    right?: string,
}

export function evaluateConstraintCompliance(store: Store, constraint: Quad_Subject, purpose: string): boolean {
    const result = evaluateConstraint(store, constraint, purpose)
    log({level: "info", message: `Evaluated ODRL constraints: ${JSON.stringify(result, null, 2)}`})
    return result.status;
}

function evaluateConstraint(store: Store, constraint: Quad_Subject, purpose: string)
    : ConstraintEvaluation {
    
    // Handle AND constraint
    const andConstraint = store.getQuads(constraint, namedNode(ODRL.and), null, null)
    if (andConstraint.length) {
        const listStart = andConstraint[0].object as Quad_Subject
        const nestedConstraints = unpackRDFList(store, listStart)
        
        const evaluations: ConstraintEvaluation[] = []
        let status = true;
        for (let nestedConstraint of nestedConstraints) {
            const evaluation = evaluateConstraint(store, nestedConstraint as Quad_Subject, purpose)
            evaluations.push(evaluation)
            if(!evaluation.status) status = false
        }
        return { and: evaluations, status}
    }

    // handle OR constraint
    const orConstraint = store.getQuads(constraint, namedNode(ODRL.or), null, null)
    if (orConstraint.length) {
        const listStart = orConstraint[0].object as Quad_Subject
        const nestedConstraints = unpackRDFList(store, listStart)
        
        const evaluations: ConstraintEvaluation[] = []
        let status = false;
        for (let nestedConstraint of nestedConstraints) {
            const evaluation = evaluateConstraint(store, nestedConstraint as Quad_Subject, purpose)
            evaluations.push(evaluation)
            if(evaluation.status) status = true
        }
        return { or: evaluations, status }
    }
    
    
    
    // Consistency Checking

    let leftOperandList = store.getQuads(constraint, namedNode(ODRL.leftOperand), null, null).map(q => q.object.value)
    let operatorList = store.getQuads(constraint, namedNode(ODRL.operator), null, null).map(q => q.object.value)
    let rightOperandList = store.getQuads(constraint, namedNode(ODRL.rightOperand), null, null).map(q => q.object.value)

    if(
        !leftOperandList || leftOperandList.length > 1 || 
        !operatorList || operatorList.length > 1 || 
        !rightOperandList ||  rightOperandList.length > 1
    ) {
        log({level: "warn", message: `Could not evaluate policy constraint ${constraint} due to incorrectly formatted ODRL.`})
        return { status: false };
    }
    const left = leftOperandList[0]
    const op = operatorList[0]
    const right = rightOperandList[0]
    
    // Check rules

    switch (left) {
        case PURPOSE:
            if (op !== ODRL.eq) {
                log({level: "warn", message: `Purpose constraint ${constraint} must use ODRL:eq as operator.`})
                return { status: false, left, op, right};
            }

            if (purpose === right) {
                return { status: true, left, op, right };
            } else {
                return { status: false, left, op, right};
            }
    
        case ODRL.dateTime:
            let date = new Date()
            let targetDate
            try { 
                targetDate = new Date(right) 
            } catch (e) {
                log({level: "warn", message: `Error converting date ${right}`})
                return { status: false, left, op, right};
            }

            if (op === ODRL.gt) {
                if (date > targetDate) {
                    return { status: true, left, op, right };
                } else {
                    return { status: false, left, op, right};
                }
            } else if (op === ODRL.lt) {
                if (date < targetDate) {
                    return { status: true, left, op, right };
                } else {
                    return { status: false, left, op, right};
                }
            } else {
                log({level: "warn", message: `Datetime constraint ${constraint} must be either odrl:gt or odrl:lt as operator`})
                return { status: false, left, op, right};
            }

        default:
            log({level: "error", message: `Failing due to unknown option: ${left}`})
            // catch unknown options as failure?
            return { status: false, left, op, right};
    }
    


}