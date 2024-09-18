# fogsaadiff

I created this library because of frustration that typical diffs didn't work very well on arrays, e.g. when you
insert or delete a value, often the diff will say that every value after it has changed.

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

## Implementation

The main body of the diff has been modified from the diff implemented in [JSON8](https://github.com/sonnyp/JSON8).

The array part of the diff is an alignment made by the [fogsaa algorithm](https://europepmc.org/article/PMC/3638164).
It has been ported from C code that I found in [github](https://github.com/chenzhiw/Fogsaa) by Hanaa Mohamed.

I re-export the patch from immutable-json-patch, because that is likely to be the
most appropriate patch function to use for use cases where this diff is useful.

## Example

```js
const bob = {name: 'bob', email: 'bob@bob.com', age: 32, address: {no: 52, street: "state st"}}
const toby = {name: 'toby', email: 'me@toby.com', age: 27, address: {no: 33, street: "mine close"}}
const jim = {name: 'jim', email: 'jim@bob.com', age: 11, address: {no: 1, street: "world"}}
const alf = {name: 'alf', email: 'alf@bob.com', age: 15, address: {no: 3, street: "leon st"}}
const toby2 = {name: 'toby', email: 'me@toby.com', age: 17, address: {no: 33, street: "mine close"}}

const a = [toby, bob, jim]
const b = [alf, toby2, bob, jim]

const p = diff(a, b)
const r = patch(a, p)

// The diff & patching process has not changed any items in a that didn't need to be changed.
console.log(a[1] === r[2], a[2] === r[3], r[0] === alf, r[2] === bob, r[3] === jim, r[1].address === toby.address)
```

The patch that fogsadiff identifies looks like this:

```json
[
  {
    "op": "replace",
    "path": "/0/age",
    "value": 17
  },
  {
    "op": "add",
    "path": "/0",
    "value": {
      "name": "alf",
      "email": "alf@bob.com",
      "age": 15,
      "address": {
        "no": 3,
        "street": "leon st"
      }
    }
  }
]
```

Notice that it's spotted that there's been a single insertion and a single edit, and the other values in the array
haven't changed at all.  JSON8 diff will create a patch that replaces every item in the array with a new one, with
44 lines of patch, instead of 19.