# RDF Containment

This document defines a specification for describing containment in RDF through the concepts of Blank Node Graphs and RDF Virtual Datasets.

## RDF concepts

### RDF Graph
First we need a definition of the concept of an RDF Graph.
For this, we base ourselves on the RDF Graph representing some kind of logic on binding triples in a group. As this context of why a set of triples are stored in a graph is undefined, we can say no more than that they have a shared *context*. 

*An **RDF Graph** denotes set of triples that have a shared context defined by the contents of the RDF Graph. All the triples contained in an RDF graph contribute to the truth within the context of this single graph.*

### Default Graph
Triples defined in the document without specifically declaring to be part of a certain graph, are part of the `default graph` defined by the scope of that document. The same goes for streams, query results, etc ...
This scope is the same boundary that is used for `blank nodes` defined in these triples.
Importantly, we see the default graph to be a *separate context* than the explicitly defined graphs in the scope.

*The **Default Graph** denotes a context that is bound to the current scope in which all triples are asserted per default as per the RDF Specification. The default graph should be processed as being a partially or totally **different context** than explicitly defined named graphs in the scope.*

### Named Graph
For the interpretation of Named Graphs, we look at the document  [on semantics of RDF Datasets](https://www.w3.org/TR/rdf11-datasets/).
As we interpret an RDF graph to contain triples that share some shared context as to why they are stored in the same graph, we see the name of this graph as a scope for this context. In this sense, a `blank node` as a name for a graph defines the context of the triples collected in that graph to be local to the scope of the RDF document, stream, ... Conversely, a `named node` used as a name for a graph, defines the scope of the contents of that graph to be within the bounds of that URI. For up to date context, one should retrieve the last information using the provided URI to evaluate the contents of the graph.

*A **Named Graph** denotes a (name, graph) pair, where the name defines the scope in which the context of the graph is defined. A **named node** used as a name for an RDF Graph defines the scope of the shared context by the triples contained in the referenced graph to be bound by the URI of that named node. A **blank node** used as the name for an RDF Graph defines the scope of the shared context to be bound to the current RDF scope (the document, stream, processing, ...), identical to the scope of the blank node in the current RDF scope.*

**Note that by the context of a graph defined in a scope, we do not mean the explicit context modeled in RDF , but the abstract concept of the shared context between the triples contained in a graph that is bound by a certain scope.**

This entails that an RDF Graph bound by a named node can only ever be considered as complete within the bounds of its URI, where an RDF Graph with a blank node as name can be considered complete within the bounds of the local RDF scope.


### Blank Node Graph
*A **Blank Node Graph** is an RDF Named Graph that has a blank node as its identifier*

### RDF Dataset
This same document [on semantics of RDF Datasets](https://www.w3.org/TR/rdf11-datasets/),
defines possible semantics for RDF datasets based on the RDF Graph semantics.

The RDF Dataset should be viewed as a virtualization of the concept of an RDF scope containing a default graph and named graphs. 

*An **RDF Dataset** denotes a containment relation between a containing dataset entity and a set of contained RDF Graphs. Different named graphs indicate different contexts and the triples inside a named graph are assumed to be true in the associated context only. The default graph is to be interpreted as operating in the global context and the triples inside are always assumed to be true in this global context.*


### RDF Virtual Dataset
To define this expression of scope in RDF, we describe the concept of containment of RDF named graphs in an RDF Dataset through a description in RDF.

*A **RDF Virtual Dataset**, defined by the rdf type `_:dataset a pack:Dataset` denotes a strict containment relation between a virtual RDF dataset and the grahs defined by the containment relation `_:dataset pack:Contains _:graph`. The RDF Virtual dataset is treated as an abstraction of its contained graphs. Any triple that targets the dataset subject `_:dataset` as its object targets all containing graphs as defined by the `pack:contains` relations defined by the dataset.*

**Note: the contains relations MUST be interpreted as graph names. Any other value MUST be discarded. The default graph CANNOT be referenced!**

**Note that the scope of blank nodes is NOT contained by this virtual dataset, but retains its scoping as defined by the RDF specification. This ensures that any graphs defined as blank nodes, even as contents of a virtual RDF Dataset are closed in the current RDF scope.**

When processing a RDF Virtual Dataset, if a target of the containment relation is a named node, the graph defined by graph name URI SHOULD be dereferenced and added to the current process to provide up to date content. **Additionally, the use of named graphs as targets for the dataset removes the guarantee that the containment is unique when merging RDF from multiple sources.**

It is no problem for multiple RDF Virtual Datasets to refer the same blank node graph in their contains relations, as it is possible for the same graph of triples to occur in multiple documents. In the same sense, you are free to duplicate the referenced graph and rename them to two separate blank node graphs, given that all references to the graphs are also duplicated. See the **Graph relabeling** chapter.

## Assumptions

We make **two main assumptions**:


### Graph relabeling 
As an RDF Named Graph defines the scope of and the shared context of the contained set of triples, **we can relabel the graph name of any Named Graph from a named node or from the default graph to a blank node at will by making the implicit context assigned to the graph name explicit!** 
By making the implied contextual meaning of a graph name explicit, similar of even more information should be available to the receiving party to make decisions about which triples to assert. Conversely, on the receiving end of data, it is perfectly viable to rename graphs to named graphs that correspond to implicit knowledge about an owned dataset, even though this will often lead to loss of contextual information.

When relabeling the default graph, we change the the implied assertion of the contained triples to be asserted within the context of the relabeled graph. It is important that enough context can be provided for this relabeled graph in a way that allows any recipient to evaluate if the contained triples should be asserted or not, by adding information about the origin for example. As long as satisfactory context is available, the receiver should be able to assert for which graphs the context is deemed as trustworthy and from which the triples can be asserted.

### RDF Virtual Dataset Containment
The RDF Virtual Dataset defines a strict containment of the RDF graphs defined by its `pack:contains` relations. This dataset may reference any of the Blank Node Graphs in the document. Referencing containment relations for Named Graphs with a Named Node as graph name MAY be supported, but will break containment assumptions and ideally require external dereferencing to guarantee completeness. RDF Virtual Datasets may share contained graphs, or may even contain graphs that define other RDF Virtual Datasets. The only requirement is that **RDF Virtual Datasets define an abstraction of their contained graphs**. 





# Examples

## Simple containment
Use RDF Virtual Datasets and Blank Node Graphs to achieve containment in a LDES setting:

**Example data**
```trig
<https://pod.rubendedecker.be/scholar/ldes2/#LDES> 
    a <https://w3id.org/ldes#EventStream>;
    <https://w3id.org/tree#member> _:n3-5, _:n3-7.

# first member
_:n3-5 a <https://example.org/ns/pack/Dataset>;
        <https://example.org/ns/pack/contains> _:n3-3, _:n3-4.


# second member        
_:n3-7 a <https://example.org/ns/pack/Dataset>;
        <https://example.org/ns/pack/contains> _:n3-6.

# first member content graph 1    
_:n3-3 {
        <https://pod.rubendedecker.be/profile/card#me> <http://xmlns.com/foaf/0.1/name> "Ruben"
}

# first member content graph 2
_:n3-4 {
        <https://pod.rubendedecker.be/profile/card#me> <http://xmlns.com/foaf/0.1/name> "Dexa"
}

# second member content graph    
_:n3-6 {
        <https://josd.github.io/card.ttl#me> <http://xmlns.com/foaf/0.1/name> "Jos"


```

**SPAQRL Query**
```sparql
SELECT ?member ?S ?P ?O
WHERE {
  ?myLdes <https://w3id.org/tree#member> ?member.
  ?member a <https://example.org/ns/pack/Dataset>.
  ?member <https://example.org/ns/pack/contains> ?ContentGraph.

  GRAPH ?ContentGraph {
   	?S ?P ?O.
  }
}

```

**Output**
| member    | s | p | o |
| --------  | ------- | ------------- | ----------- |
| _:n3-5    | https://pod.rubendedecker.be/profile/card#me | http://xmlns.com/foaf/0.1/name | "Ruben" |
| _:n3-5    | https://pod.rubendedecker.be/profile/card#me | http://xmlns.com/foaf/0.1/name | "Dexa"  |
| _:n3-7    | https://josd.github.io/card.ttl#me           | http://xmlns.com/foaf/0.1/name | "Jos"   |

****


[Query Live Link](https://query.comunica.dev/#datasources=https%3A%2F%2Fpod.rubendedecker.be%2Fscholar%2Fldes2%2Fpage0.trig&query=SELECT%20%3Fmember%20%3FS%20%3FP%20%3FO%0AWHERE%20%7B%0A%20%20%3FmyLdes%20%3Chttps%3A%2F%2Fw3id.org%2Ftree%23member%3E%20%3Fmember.%0A%20%20%3Fmember%20a%20%3Chttps%3A%2F%2Fexample.org%2Fns%2Fpack%2FDataset%3E.%0A%20%20%3Fmember%20%3Chttps%3A%2F%2Fexample.org%2Fns%2Fpack%2Fcontains%3E%20%3FContentGraph.%0A%0A%20%20GRAPH%20%3FContentGraph%20%7B%0A%20%20%20%09%3FS%20%3FP%20%3FO.%0A%20%20%7D%0A%7D%0A)

**Note that SPARQL Construct does not support constructing RDF graphs sadly.**


## Compliance through Policy evaluation
**TODO: create SPARQL query (annoying with list processing)**

[Example using TypeScript evaluator CLI TOOL](https://github.com/Dexagod/RDF-containment/?tab=readme-ov-file#running-the-evaluator-cli-tool)




## Trust through Signature Evaluation

[Example LIVE SPARQL Query](https://query.comunica.dev/#datasources=https%3A%2F%2Fpod.rubendedecker.be%2Fscholar%2Fldes%2Fpage0.trig&query=SELECT%20%3FS%20%3FP%20%3FO%0AWHERE%20%7B%0A%20%20GRAPH%20%3FG%20%7B%0A%20%20%20%20%3Fsignature%20%3Chttps%3A%2F%2Fexample.org%2Fns%2Fsign%2Fissuer%3E%20%3Chttps%3A%2F%2Fpod.rubendedecker.be%2Fprofile%2Fcard%23me%3E.%0A%20%20%20%20%3Fsignature%20%3Chttps%3A%2F%2Fexample.org%2Fns%2Fsign%2Ftarget%3E%20%3FsignatureTarget.%0A%20%20%7D%0A%0A%20%20GRAPH%20%3FG2%20%7B%0A%20%20%09%3FsignatureTarget%20a%20%3FtargetType.%0A%20%20%20%20%3FsignatureTarget%20%3Chttps%3A%2F%2Fexample.org%2Fns%2Fpack%2Fcontains%3E%20%3FContentGraph.%0A%20%20%7D%0A%0A%20%20GRAPH%20%3FContentGraph%20%7B%0A%20%20%20%09%3FS%20%3FP%20%3FO.%0A%20%20%7D%0A%7D%0A)

Note that this query would require retrieving all signature information and evaluating afterwards to make data fully trusted! 

The CLI tool already implements this verification!

[Example using TypeScript evaluator CLI TOOL](https://github.com/Dexagod/RDF-containment/?tab=readme-ov-file#running-the-evaluator-cli-tool)