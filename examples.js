import {diff, patch} from "./lib/diff.js"

function test(a, b) {
    const df = diff(a, b)
    console.log("\n************************************")
    console.log(JSON.stringify(a), '->', JSON.stringify(b))
    console.log(JSON.stringify(df, null, 2))
    console.log(JSON.stringify(patch(a, df)))
}

test([1, 2, 3, 4, 5, 2], [2, 3, 6, 2])

test("GTCGTAGAATA".split(""), "CACGTAGTA".split(""))

const bob = {name: 'bob', email: 'bob@bob.com', age: 32, address: {no: 52, street: "state st"}}
const toby = {name: 'toby', email: 'me@toby.com', age: 27, address: {no: 33, street: "mine close"}}
const jim = {name: 'jim', email: 'jim@bob.com', age: 11, address: {no: 1, street: "world"}}
const alf = {name: 'alf', email: 'alf@bob.com', age: 15, address: {no: 3, street: "leon st"}}
const toby2 = {name: 'toby', email: 'me@toby.com', age: 17, address: {no: 33, street: "mine close"}}
const a = [toby, bob, jim]
const b = [alf, toby2, bob, jim]
test(a, b)
const p = diff(a, b)
const r = patch(a, p)
// The diff & patching process has not changed any items in a that didn't need to be changed.
console.log(a[1] === r[2], a[2] === r[3], r[0] === alf, r[2] === bob, r[3] === jim, r[1].address === toby.address)


test([], [{axis:1, score:22}])

test({a: "hi", b: []}, {a: "hi", c: 'there', b:[{axis:1, score:22}]})