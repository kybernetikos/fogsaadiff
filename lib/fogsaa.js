// This code ported from the c code at https://github.com/chenzhiw/Fogsaa by Hanaa Mohamed and includes some
// original comments.
//
// FOGSAA is described here: https://europepmc.org/article/PMC/3638164, although I didn't spend much time
// with the paper - I mainly just translated the c code to javascript and made minor modification.
//
// The diff uses fogsaa to align arrays and try to find small numbers of insertions/substititons/deletions
// I intend it to be useful with json patch when diffing different versions of the same immutable datastructure

import {Queue} from "./queue.js"
import {encode} from "./utils.js"

const NODE_TYPES = {
    root: -1,
    subst: 1, // match or mismatch
    ins: 2,
    del: 4
}

const COST_MISMATCH = -1, COST_MATCH = 1, COST_GAP = -1;

function matrixNode(presentScore = 0, minScore = 0, maxScore = 0, type = 0, written = false) {
    return {presentScore, minScore, maxScore, type, written}
}

function createMatrix(s1, s2) {
    return Array.from({length: s1.length + 1}, () =>  Array.from({length: s2.length + 1}, () => matrixNode()))
}

function calculateScore(s1, s2, prs, p1, p2) {
    const x1 = s1.length - p1
    const x2 = s2.length - p2
    let out1, out2
    if (x1 <= x2) {
        out1 = prs + x1 * COST_MISMATCH + (x2 - x1) * COST_GAP
        out2 = prs + x1 * COST_MATCH + (x2 - x1) * COST_GAP
    } else {
        out1 = prs + x2 * COST_MISMATCH + (x1 - x2) * COST_GAP
        out2 = prs + x2 * COST_MATCH + (x1 - x2) * COST_GAP
    }
    return [out1, out2]
}

function sort(a, b, ch) {
    ch[0] = 1
    ch[1] = 2
    ch[2] = 4
    for (let i = 0; i < 2; ++i) {
        for (let j = 0; j < 2 - i;  ++j) {
            if ((a[j] < a[j + 1]) || ((a[j] === a[j + 1]) && (b[j] < b[j + 1]))) {
                [a[j], a[j+1]] = [a[j+1], a[j]];
                [ch[j], ch[j+1]] = [ch[j+1], ch[j]];
                [b[j], b[j+1]] = [b[j+1], b[j]];
            }
        }
    }
}

export function arrayDiff(a1, a2, prefix = [], replaceDiffFn = deepDiff) {
    const a = [0,0,0], b = [0,0,0], ch = [0,0,0];
    // these 3 arrays will be used as temporary storage for the min & max score of the 3 children
    // of the current node being processed and its type in order to help us decide which node we
    // should expand

    let p, newType, newScore, np1, np2, newLower, newUpper, nextLower, nextUpper
    let typeTotal = 1
    let expanded = 0
    let optimalx = 0, optimaly = 0;
    let p1 = 0, p2 = 0

    const s1len = a1.length
    const s2len = a2.length

    const cell = createMatrix(a1, a2)

    const [o_min_score, o_max_score] = calculateScore(a1, a2, 0, p1, p2)
    cell[0][0] = matrixNode(0, o_min_score, o_max_score, NODE_TYPES.root, false)

    /* Setting optimal score to be the lowest possible score if all symbols just mismatched */
    let optimalScore = cell[0][0].minScore

    /*  setting the capacity of the queue and initializing it */
    const queueCapacity = cell[0][0].maxScore - cell[0][0].minScore + 1
    const queue = new Queue(queueCapacity)

    let branchEnd = false // a variable used to indicate whether the branch was totally expanded

    if (s1len !== 0 && s2len !== 0) {
        do {

            branchEnd = true
            while ((p1 <= s1len-1) || (p2 <= s2len-1)) {
                const present = cell[p1][p2].presentScore

                if ((typeTotal === 1) || (typeTotal === 2) || (typeTotal === 4)) {
                    if (p1 <= s1len-1 && p2 <= s2len-1) {
                        p = a1[p1] === a2[p2] ? COST_MATCH : COST_MISMATCH;

                        [a[0], b[0]] = calculateScore(a1, a2, present + p, p1 + 1, p2 + 1);
                        [a[1], b[1]] = calculateScore(a1, a2, present + COST_GAP, p1, p2 + 1);
                        [a[2], b[2]] = calculateScore(a1, a2, present + COST_GAP, p1 + 1, p2);
                        sort(a, b, ch)

                        if (ch[0] === 1) {
                            newType = NODE_TYPES.subst
                            np1 = p1 + 1
                            np2 = p2 + 1
                            newScore = present + p
                        } else if (ch[0] === 2) {
                            newType = NODE_TYPES.ins
                            np1 = p1
                            np2 = p2 + 1
                            newScore = present + COST_GAP
                        } else {
                            newType = NODE_TYPES.del
                            np1 = p1 + 1
                            np2 = p2
                            newScore = present + COST_GAP
                        }

                        queue.insert(p1, p2, newType + ch[1], ch[1], a[1], b[1], cell[0][0].minScore, cell[p1][p2] === undefined ? 0 : cell[p1][p2].minScore)
                    } else if (p1 <= s1len-1) {
                        // only childtype3 = 4 is possible
                        newType = NODE_TYPES.del
                        np1 = p1 + 1
                        np2 = p2
                        newScore = present + COST_GAP
                    } else {
                        newType =  NODE_TYPES.ins
                        np1 = p1
                        np2 = p2 + 1
                        newScore = present + COST_GAP
                    }
                }  else if ((typeTotal === 3) || (typeTotal === 5) || (typeTotal===6)) {
                    //this is the 2nd child
                    if (newType === NODE_TYPES.subst) {
                        // 2nd child is of child type1
                        np1 = p1 + 1
                        np2 = p2 + 1
                        if (a1[p1] === a2[p2]) {
                            p = COST_MATCH
                        } else {
                            p = COST_MISMATCH
                        }
                        newScore = present + p
                        if (7 - typeTotal === 2) {
                            [nextLower, nextUpper] = calculateScore(a1, a2, present + COST_GAP, p1, p2 + 1)
                        } else if (7 - typeTotal=== 4) {
                            [nextLower, nextUpper] = calculateScore(a1, a2, present + COST_GAP, p1 + 1, p2)
                        }
                        queue.insert(p1, p2, 7, 7 - typeTotal, nextLower, nextUpper, cell[0][0].minScore, cell[p1][p2] === undefined ? 0 : cell[p1][p2].minScore)
                    } else if (newType === NODE_TYPES.ins) {
                        // 2nd child is of type2
                        np1 = p1
                        np2 = p2 + 1
                        newScore = present + COST_GAP
                        if (7-typeTotal === 1) {
                            if (a1[p1] === a2[p2]) {
                                p = COST_MATCH
                            } else {
                                p = COST_MISMATCH
                            }
                            [nextLower, nextUpper] = calculateScore(a1, a2, present + p, p1 + 1, p2 + 1)
                        } else if (7 - typeTotal === 4) {
                            [nextLower, nextUpper] = calculateScore(a1, a2, present + COST_GAP, p1 + 1, p2)
                        }
                        queue.insert(p1, p2, 7, 7 - typeTotal, nextLower, nextUpper, cell[0][0].minScore, cell[p1][p2] === undefined ? 0 : cell[p1][p2].minScore)
                    } else {
                        // 2nd child is of type=4
                        np1 = p1 + 1
                        np2 = p2
                        newScore = present + COST_GAP

                        if (7 - typeTotal === 1){
                            if (a1[p1] === a2[p2]) {
                                p = COST_MATCH
                            } else {
                                p = COST_MISMATCH
                            }
                            [nextLower, nextUpper] = calculateScore(a1, a2, present + p, p1 + 1, p2 + 1)
                        } else if (7 - typeTotal === 2) {
                            [nextLower, nextUpper] = calculateScore(a1, a2, present + COST_GAP, p1, p2 + 1)
                        }
                        queue.insert(p1, p2, 7, 7 - typeTotal, nextLower, nextUpper, cell[0][0].minScore, cell[p1][p2] === undefined ? 0 : cell[p1][p2].minScore);
                    }
                } else if (typeTotal === 7) {
                    // this is the 3rd child
                    if (newType === NODE_TYPES.subst){
                        np1 = p1 + 1
                        np2 = p2 + 1

                        if (a1[p1] === a2[p2]) {
                            p = COST_MATCH
                        } else {
                            p = COST_MISMATCH;
                        }
                        newScore = present + p
                    } else if (newType === NODE_TYPES.ins){
                        np1 = p1
                        np2 = p2 + 1
                        newScore = present + COST_GAP
                    } else{
                        np1 = p1 + 1
                        np2 = p2
                        newScore = present + COST_GAP
                    }
                    // no node to be inserted in the queue
                }

                if (cell[np1][np2] !== undefined && cell[np1][np2].type <= 4 && cell[np1][np2].presentScore >= newScore && cell[np1][np2].written) {
                    // skip the path if the already expanded node is better
                    branchEnd = false;
                    break;
                } else {
                    // set the cell
                    [newLower, newUpper] = calculateScore(a1, a2, newScore, np1, np2)
                    cell[np1][np2] = matrixNode(newScore, newLower, newUpper, newType, true)
                }
                p1 = np1
                p2 = np2
                typeTotal = 1

                if (cell[np1][np2].maxScore < optimalScore) {
                    // prune the current branch
                    branchEnd = false
                    break
                }
                expanded++
            }

            if (cell[p1][p2].presentScore > optimalScore && branchEnd) {
                optimalScore = cell[p1][p2].presentScore
                // set the current path as the optimal path
                optimalx = p1
                optimaly = p2
            }

            // pop the topmost node on the priority queue (with the biggest Max_Score)
            const topmost = queue.peek()
            if (topmost !== null) {
                p1 = topmost.p1
                p2 = topmost.p2

                typeTotal = topmost.type_up_tonext
                newLower = topmost.chMin_score
                newUpper = queue.maxPointer + cell[0][0].minScore
                newType = topmost.chtype
                queue.delete()
            }
        } while (optimalScore < newUpper) // while the max_score of the top most node on the queue is higher than the optimalScore so far

        return constructDiff(a1, a2, prefix, cell, optimalx, optimaly, replaceDiffFn)
    } else {
        // one of them is of 0 length
        return constructDiff(a1, a2, prefix, cell, 0, 0, replaceDiffFn)
    }

}

function constructDiff(s1, s2, prefix, cell, x, y, replaceDiffFn) {
    let diff = []
    const m = s1.length
    const n = s2.length

    if (!(x===0 && y===0)) {
        while (!(x === 0 && y === 0)) { //where Cell[0][0] is the root node
            const cellType = cell[x][y].type

            if (cellType === NODE_TYPES.subst) {
                // match/mismatch
                const c1 = s1[--x]
                const c2 = s2[--y]

                if (c1 !== c2) {
                    diff = diff.concat(replaceDiffFn(c1, c2, [...prefix, String(x)]))
                }
            } else if (cellType === NODE_TYPES.ins) {
                //a gap in Seq1
                const newC = s2[--y]
                diff.push({op: 'add', path: encode([...prefix, String(x)]), value: newC})
            } else if (cellType === NODE_TYPES.del) {
                const delC = s1[--x]
                diff.push({op: 'remove', path: encode([...prefix, String(x)])})
            } else if (cellType === -1) {
                throw new Error("cell is root, not supposed to happen")
            }
        }
    } else if (x===0 && y===0) {
        for (let i = 0; i < Math.min(m, n); ++i) {
            diff = diff.concat(replaceDiffFn(s1[i], s2[i], [...prefix, String(i)]))
        }
        for (let i = Math.min(m,n); i < n; ++i) {
            diff.push({op: 'add', path: encode([...prefix, String(i)]), value: s2[i]})
        }
        for (let i = n; i < m; ++i) {
            diff.push({op: 'remove', path: encode([...prefix, String(i)])})
        }
    }
    return diff
}

function deepDiff(a, b, prefix) {
    return [{op: 'replace', path: encode(prefix), value: b}]
}
