# Chaining Context with RDF 1.1 Blank Node Graphs - RDF Blank Node Graph Package Chaining (BPC)


## Requirements 
* adding metadata to any content
* adding 
* adding additional data to packaged data
* add


# Spec



## Signatures

A signature of a resource or graph takes the following form:


### target URIs 

#### Signature
* MUST dereference the named graph
* Use c14n canonicalization algorithm over the contents of the graph
* Sign graph with https://github.com/jeswr/rdfjs-sign

#### Verification
* MUST dereference the named graph
* Use c14n canonicalization algorithm over the contents of the graph
* Verify generated signature


# Examples


## Generic Chaining Rules

* When is a blank node a graph?
  * if there is more than 0 triples where the blank node occurs in the graph position
* Signatures should define the issuer, target format, target type, and signature method:
  * format: text/turtle
    * signature_method: c14n
      * type: rdf:Graph - only signs the graph contents
      * type: rdf:Dataset - signs all graphs that are defines as contents of the dataset!
      * if its named node - dereference remotely and verify
      * if blank node - dereference locally and verify
      * if URN ?????
  * image/jpg
    * signature_method
    * dereference image and verify according to used method




GRAPH _:g1 
{
    <Ruben> <personality> <cool>
}

Graph _:provenance

GRAPH _:g2 
{
    <Ruben> <personality> <awesome>
}


GRAPH _:g2 
{
    _:d1 a pack:Dataset
    _:d1 pack:contains _:g1
}

GRAPH _:g2
{ 
    <Ruben> <personality> <awesome>.
}

GRAPH _:provenance 
{ 
    _:content <retrieved_at> <source1>
    _:content <retrieved_at> "2024-05-03T09:04:12Z
}

GRAPH _:signature
{
    _:provenance f
}

### 


## Chaining using RDF BNG

// Source 1 has the following statement internally

<a> <b> <c> <http://example.org/document1>.

// Source 1 knows that this means that the triple originated from this document.
// When queried for <a> <b> <?> by source 2, source 1 returns the following

<a> <b> <c> _:g.
_:g <origin> <http://example.org/document1>.

// Does this change the contents of the document? Depending on your interpretation of RDF Graphs not, as they only contextualize the content. There is no definitive answer on if this rewriting of the context of the triple changed its semantics as there is no concrete semantics other than being the context of the triple.
// now given source2 has the following content

<a> <b> <d> <http://example2.org/document1>

// It can either add the new content directly 

<a> <b> <d> <http://example2.org/document1>
<a> <b> <c> _:g.
_:g <origin> <http://example.org/document1>.
_:g <retrievedFrom> <source1>.

// Or it can convert the external content to fit its internal expression of context.

<a> <b> <d> <http://example2.org/document1>
<a> <b> <c> <http://example.org/document1>

// Note that this loses the information from where data was retrieved. But this is a valid way to handle data.
// In case in case source2 does not understand the <origin> predicate, it is free to ignore this context

<a> <b> <d> <http://example2.org/document1>
<a> <b> <c> _:g.
_:g <retrievedFrom> <source1>.

// Note that this gives an equal amount of information as using the named graph, with the exception of dereferencing the graph, which is not part of the RDF spec anyways.



## Real World Example

Given an set of statements from Jos's Data Space:

```
@prefix : <urn:example:ns#> .
@prefix ical: <http://www.w3.org/2002/12/cal/ical#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

:event1
  "ical:summary": "meeting";
  "ical:dtstart": "2024-09-09T09:00:00Z"^^xsd:dateTime;
  "ical:dtend": "2024-09-09T11:00:00Z"^^xsd:dateTime.

:event2
  "ical:summary": "meeting";
  "ical:dtstart": "2024-09-09T13:00:00Z"^^xsd:dateTime;
  "ical:dtend": "2024-09-09T15:00:00Z"^^xsd:dateTime.
```

Patrick has his own set of statements on his Data Space:

```
@prefix : <urn:example:ns#> .
@prefix ical: <http://www.w3.org/2002/12/cal/ical#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

:event1
  "ical:summary": "meeting";
  "ical:dtstart": "2024-09-09T07:00:00Z"^^xsd:dateTime;
  "ical:dtend": "2024-09-09T10:00:00Z"^^xsd:dateTime.

:event2
  "ical:summary": "meeting";
  "ical:dtstart": "2024-09-09T14:00:00Z"^^xsd:dateTime;
  "ical:dtend": "2024-09-09T16:00:00Z"^^xsd:dateTime.
```

Ruben wants to have a meeting with Patrick and Jos on 2024-09-09


