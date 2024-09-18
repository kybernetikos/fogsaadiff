fogsaadiff
==========

[JSON Patch](https://tools.ietf.org/html/rfc6902) defines a JSON document structure for expressing a
sequence of operations to apply to a JavaScript Object Notation
(JSON) document; it is suitable for use with the HTTP PATCH method.

fogsaadiff creates a JSON Patch document by diffing two JSON objects.

I have created it with the intention that it would be a good diff for working
with different versions of a single immutable datastructure, so most of the
deeply nested objects would be structurally shared and refer to the same objects.

Because of this, I look for opportunities to return early, and I try to avoid
replacing whole objects.  I also attempt to find an optimal alignment for any
arrays that keeps the number of insertions and deletions small.

Implementation
-------------

The main body of the diff has been modified from the diff implemented in [JSON8](https://github.com/sonnyp/JSON8).

The array part of the diff is an alignment made by the [fogsaa algorithm](https://europepmc.org/article/PMC/3638164).
It has been ported from C code that I found in [github](https://github.com/chenzhiw/Fogsaa) by Hanaa Mohamed.

I re-export the patch from immutable-json-patch, because that is likely to be the
most appropriate patch function to use for use cases where this diff is useful.