# RDF Containment

This document defines a specification for describing containment in RDF.

## RDF concepts


### RDF Graph
First we need a definition of the concept of an RDF Graph.

*An **RDF Graph** denotes set of triples that have a shared context defined by the contents of the RDF Graph. All the triples contained in an RDF graph contribute to the truth within the context of this single graph.*

### Named Graph
Secondly, we need to define the concept of Named Graphs in RDF.
According to the document [on semantics of RDF Datasets](https://www.w3.org/TR/rdf11-datasets/),
there are many possible choices for the denotation of graph names.
In the spirit of managing containment of RDF for exchange and contextualization,
we use the following interpretation for the concept of Named Graph in RDF.

*A **Named Graph** denotes a (name, graph) pair, where the name defines the boundary for the context of the graph. If the graph name is a blank node, the graph is defined in the local scope. If the graph name is a URL, the graph is defined in the scope of that URL.*

This entails that a named graph with a named node as its name value can only ever be considered as complete within the confines of the its URL domain. A Graph with a blank node as its name value is always considered as complete within the confines of the local scope.

### RDF Dataset
This same document [on semantics of RDF Datasets](https://www.w3.org/TR/rdf11-datasets/),
defines possible semantics for RDF datasets based on the RDF Graph semantics.

The RDF Dataset should be viewed as a virtualization of the concept of an RDF document containing graphs of RDF data.
Based on the interpretation of the RDF Graph concept defined above, 
we use the following interpretation for an RDF Dataset:

*An **RDF Dataset** denotes a containment relation between a containing dataset entity and a set of contained RDF Graphs. Different named graphs indicate different contexts and the triples inside a named graph are assumed to be true in the associated context only. The default graph is to be interpreted as operating in the global context and the triples inside are always assumed to be true in this global context.*


## Vacabulary

We define an extension to the RDF to allow the use of RDF Named Graphs and RDF Datasets for containment in RDF.

```
# Profile Document Information
GRAPH _:profile 
{
    <https://pod.rubendedecker.be/profile/card#me> a foaf:Person;
        foaf:givenName "Ruben"@en;
        foaf:img <https://pod.rubendedecker.be/profile/profile-image.jpg>.
}

# Profile Image Signature
GRAPH _:profileImageSignature
{
    _:s a sign:DataIntegrityProof;
        sign:created "2024-08-22T23:02:28Z"^^xsd:dateTime;
        sign:issuer <https://pod.rubendedecker.be/profile/card#me>;
        sign:cryptosuite: "eddsa-rdfc-2022";
        sign:verificationMethod: <https://pod.rubendedecker.be/keys/pub>";
        sign:proofPurpose: "assertionMethod";
        sign:proofValue: "z58DAdFfa9SkqZMVPxAQp...jQCrfFPP2oumHKtz";
        sign:contentManipulation _:manipulation;
        sign:target <https://pod.rubendedecker.be/profile/profile-image.jpg>.

    _:manipulation 
        sign:hashMethod "SHA-1";

    <https://pod.rubendedecker.be/profile/profile-image.jpg> a ex:Image;
        sign:mimeType "image/png".    
}

# rdf dataset of profile information 

_:profileDataset a rdf:Dataset;
    rdf:contains _:profile, _:profileImageSignature.


# Profile retrieval metadata
GRAPH _:retrievalProvenance
{
    _:profile pack:retrievedFrom <https://pod.rubendedecker.be/profile/card>;
        pack:retrievedAt "2024-08-22T23:02:28Z"^^xsd:dateTime.
}

Graph _:retrievalSignature
{
    _:signature13412 a sign:DataIntegrityProof;
        sign:created "2024-08-22T23:02:28Z"^^xsd:dateTime;
        sign:issuer <https://pod.rubendedecker.be/profile/card#me>;
        sign:cryptosuite: "eddsa-rdfc-2022";
        sign:verificationMethod: <https://pod.rubendedecker.be/keys/pub>";
        sign:proofPurpose: "assertionMethod";
        sign:proofValue: "dqdqih92231h8n1nfb3u8...1231d8988hf83b";
        sign:contentManipulation _:manipulation;
        sign:target _:profileDataset.

    _:manipulation 
        sign:canonicalizationMethod "C14N";
        sign:hashMethod "SHA-1".
}

# Policy over retrieved dataset
GRAPH _:retrievalPolicy 
{
    _:policy a <https://www.w3.org/ns/odrl/2/Agreement>;
        <https://www.w3.org/ns/odrl/2/permission> _:p1.
    _:p1 <https://www.w3.org/ns/odrl/2/target> _:profileDataset;
        <https://www.w3.org/ns/odrl/2/assigner> <https://pod.rubendedecker.be/profile/card#me>;
        <https://www.w3.org/ns/odrl/2/assignee> <https://josd.github.io/>;
        <https://www.w3.org/ns/odrl/2/action> <https://www.w3.org/ns/odrl/2/use>.
}

# rdf dataset of profile information

_:metaDataset a rdf:Dataset;
    rdf:contains _:policy, _:provenance, _:profileDataset.


Graph _:metadataSignature
{
    _:signature21523 a sign:DataIntegrityProof;
        sign:created "2024-08-22T23:02:28Z"^^xsd:dateTime;
        sign:issuer <https://pod.rubendedecker.be/profile/card#me>;
        sign:cryptosuite: "eddsa-rdfc-2022";
        sign:verificationMethod: <https://pod.rubendedecker.be/keys/pub>";
        sign:proofPurpose: "assertionMethod";
        sign:proofValue: "131ggb4v4d21f3e1...FF88h2@Hjsknss";
        sign:contentManipulation _:manipulation;
        sign:target _:metaDataset.

    _:manipulation 
        sign:canonicalizationMethod "C14N";
        sign:hashMethod "SHA-1".
}

```

In short, the sharing of a resource can be contextualized in the following manner:

```
content_dataset = [
    g1 { graph to share }
    g2 { additional graph / signature / information }
]

meta_dataset = [
    g3 { content_dataset signature }
    g4 { content_dataset provenance }
    g5 { content_dataset policy }
]

{ meta_dataset signature }
```