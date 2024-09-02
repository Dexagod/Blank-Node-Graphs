import { linguareasoner } from 'eyereasoner';

import { DataFactory } from "../../../software/src";
const { namedNode, blankNode, literal, quad } = DataFactory


const policy = `

@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix log: <http://www.w3.org/2000/10/swap/log#>.
@prefix var: <http://www.w3.org/2000/10/swap/var#>.
@prefix : <http://example.org/socrates#>.

_:n3-4 {
    _:n3-6 a <http://www.w3.org/ns/odrl/2/Constraint>;
        <http://www.w3.org/ns/odrl/2/leftOperand> <http://www.w3.org/ns/odrl/2/dateTime>;
        <http://www.w3.org/ns/odrl/2/operator> <http://www.w3.org/ns/odrl/2/lt>;
        <http://www.w3.org/ns/odrl/2/rightOperand> "2024-09-01T10:47:53.767Z"^^<http://www.w3.org/2001/XMLSchema#dateTime>.

    _:n3-8 a <http://www.w3.org/ns/odrl/2/Constraint>;
        <http://www.w3.org/ns/odrl/2/leftOperand> <https://w3id.org/oac#Purpose>;
        <http://www.w3.org/ns/odrl/2/operator> <http://www.w3.org/ns/odrl/2/eq>;
        <http://www.w3.org/ns/odrl/2/rightOperand> <https://w3id.org/dpv#NonCommercialPurpose>.

    _:n3-9 a <http://www.w3.org/ns/odrl/2/Constraint>;
        <http://www.w3.org/ns/odrl/2/leftOperand> <https://w3id.org/oac#Purpose>;
        <http://www.w3.org/ns/odrl/2/operator> <http://www.w3.org/ns/odrl/2/eq>;
        <http://www.w3.org/ns/odrl/2/rightOperand> <https://w3id.org/dpv#ServicePersonalisation>.

    _:n3-10 a <http://www.w3.org/ns/odrl/2/Constraint>;
        <http://www.w3.org/ns/odrl/2/leftOperand> <https://w3id.org/oac#Purpose>;
        <http://www.w3.org/ns/odrl/2/operator> <http://www.w3.org/ns/odrl/2/eq>;
        <http://www.w3.org/ns/odrl/2/rightOperand> <https://w3id.org/dpv#ServiceProvision>.

    _:n3-13 <http://www.w3.org/1999/02/22-rdf-syntax-ns#rest> _:n3-12;
        <http://www.w3.org/1999/02/22-rdf-syntax-ns#first> _:n3-8.
    _:n3-12 <http://www.w3.org/1999/02/22-rdf-syntax-ns#rest> _:n3-11;
        <http://www.w3.org/1999/02/22-rdf-syntax-ns#first> _:n3-9.
    _:n3-11 <http://www.w3.org/1999/02/22-rdf-syntax-ns#rest> <http://www.w3.org/1999/02/22-rdf-syntax-ns#nil>;
        <http://www.w3.org/1999/02/22-rdf-syntax-ns#first> _:n3-10.

    _:n3-7 <http://www.w3.org/ns/odrl/2/or> _:n3-13.

    _:n3-14 <http://www.w3.org/ns/odrl/2/constraint> _:n3-15;
        <http://www.w3.org/ns/odrl/2/target> _:dataset;
        <http://www.w3.org/ns/odrl/2/action> <http://www.w3.org/ns/odrl/2/use>, <http://www.w3.org/ns/odrl/2/read>.

    _:n3-16 <http://www.w3.org/1999/02/22-rdf-syntax-ns#rest> <http://www.w3.org/1999/02/22-rdf-syntax-ns#nil>;
        <http://www.w3.org/1999/02/22-rdf-syntax-ns#first> _:n3-7.

    _:n3-17 <http://www.w3.org/1999/02/22-rdf-syntax-ns#rest> _:n3-16;
        <http://www.w3.org/1999/02/22-rdf-syntax-ns#first> _:n3-6.

    _:n3-15 <http://www.w3.org/ns/odrl/2/and> _:n3-17.

    _:n3-18 a <http://www.w3.org/ns/odrl/2/Agreement>;
        <http://www.w3.org/ns/odrl/2/uid> <urn:policy:e1e6474a-bbea-40cb-9290-911991fb0ae1>;
        <http://www.w3.org/ns/odrl/2/permission> _:n3-14.
}

_:g0 {
    _:dataset a <https://example.org/ns/pack/Dataset>;
        <https://example.org/ns/pack/contains> _:g1, _:g2.
}

_:g1 {
    <a> <b> <c>.
}

_:g2 {
    <a> <b> <c>.
    <x> <y> <z>.
}
    
`

const test = `
@prefix graph: <http://www.w3.org/2000/10/swap/graph#> .
@prefix log: <http://www.w3.org/2000/10/swap/log#>.
@prefix var: <http://www.w3.org/2000/10/swap/var#>.


_:data {
    <s1> <p1> <o1>.
    <s2> <p2> <o2>.
}

_:p1 log:implies _:p2.

_:p1 {
    var:graph graph:member { <s1> <p1> <o1> }.
}

_:p2 {
    <s3> <p3> <o3>.
}
`


const rules = `
# ------------------
# Socrates Inference
# ------------------
#
# Infer that Socrates is mortal.

@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix log: <http://www.w3.org/2000/10/swap/log#>.
@prefix var: <http://www.w3.org/2000/10/swap/var#>.
@prefix : <http://example.org/socrates#>.

# query
_:ng3 log:query _:ng3.

_:ng3 {
    var:S var:P var:O.
}`

async function run() {

    const result = await linguareasoner([ /*policy,*/ test, rules ])
        
    console.log(result)

}

run();
