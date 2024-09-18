export {immutableJSONPatch as patch} from "immutable-json-patch";
import {encode} from "./utils.js"
import {arrayDiff} from "./fogsaa.js"

// Based on JSON8
// Copyright (c) 2018, Sonny Piers <sonny@fastmail.net>
// Adapted under the ISC license https://github.com/sonnyp/JSON8/blob/bac1cc176693e795de9d71f4cb5842ad5cdf6af1/LICENSE
// Changes: I want this to work well with immutability, so I made some changes to short circuit when it can
//          and to try to keep the number of changes small.  I also changed it to use an array alignment
//          algorithm to try to find small numbers of array insertions/deletions/replacements.

const NUMBER = "number"
const BOOLEAN = "boolean"
const NULL = "null"
const STRING = "string"
const ARRAY = "array";
const OBJECT = "object";

function isPrimitive(type) {
    return type !== ARRAY && type !== OBJECT
}

function toObject(map) {
    const object = Object.create(null)
    for (let [value, key] of map) {
        object[key] = value
    }
    return object
}

// returns undefined for Infinity, undefined, NaN and function.  I think this is because they're not valid JSON.
function type(obj) {
    const type = typeof obj

    if (type === BOOLEAN || type === STRING) {
        return type
    } else if (type === NUMBER && isFinite(obj)) {
        return NUMBER
    } else if (type === OBJECT) {
        if (Array.isArray(obj)) {
            return ARRAY
        } else if (global.Set && obj instanceof Set) {
            return ARRAY
        } else if (global.Map && obj instanceof Map) {
            return OBJECT
        } else if (obj === null) {
            return NULL
        } else {
            return OBJECT
        }
    }
}

function equal(a, b) {
    if (Object.is(a, b)) return true

    const typeA = type(a)
    const typeB = type(b)

    if (typeA !== typeB) return false

    switch (typeA) {
        case NUMBER:
            if (a === 0 && 1 / a === -Infinity) return b === 0 && 1 / b === -Infinity
        case STRING:
        case NULL:
        case BOOLEAN:
            return a === b;
    }

    if (typeA === ARRAY) {
        if (global.Set) {
            if (a instanceof Set) a = Array.from(a)
            if (b instanceof Set) b = Array.from(b)
        }
        if (a.length !== b.length) return false
        return a.every((aElement, index) => equal(aElement, b[index]))
    } else if (typeA === OBJECT) {
        if (global.Map) {
            if (a instanceof Map) a = toObject(a)
            if (b instanceof Map) b = toObject(b)
        }
        const keys = Object.keys(a)
        if (keys.length !== Object.keys(b).length) return false
        for (let key of keys) {
            if (b.hasOwnProperty && !b.hasOwnProperty(key)) return false
            if (!equal(b[key], a[key])) return false
        }
        return true
    }

    return true
}

export function diff(a, b, prefix = []) {
    let patches = []
    if (Object.is(a,b)) return patches

    const aType = type(a)
    const bType = type(b)

    if (bType !== aType) {
        if (aType === undefined) {
            patches.push({ op: "add", path: encode(prefix), value: b })
        } else if (bType === undefined) {
            patches.push({ op: "remove", path: encode(prefix)})
        } else {
            patches.push({ op: "replace", path: encode(prefix), value: b })
        }
        return patches
    } else if (isPrimitive(bType)) {
        if (!equal(a, b)) {
            patches.push({ op: "replace", path: encode(prefix), value: b })
        }
        return patches
    }

    if (aType === ARRAY) {
        patches = patches.concat(arrayDiff(a, b, prefix, diff))
    } else if (aType === OBJECT) {
        // both are objects
        for (let key of Object.keys(b)) {
            patches = patches.concat(diff(a[key], b[key], [...prefix, key]))
        }
        for (let key of Object.keys(a)) {
            if (b[key] !== undefined) continue
            patches.push({ op: "remove", path: encode([...prefix, key]) })
        }
    }
    return patches
}
