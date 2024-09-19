export class Queue {
    constructor(capacity) {
        this.q = Array.from({length: capacity}, () => null)
        this.maxPointer = -1 //the pointer to the node with maximum Score on top of the priority queue
    }

    newNode(p1, p2, chtype, type_up_tonext, chMin_score, next) {
        return {p1, p2, chtype, type_up_tonext, chMin_score, next}
    }

    delete() {
        if (this.maxPointer !== -1) {
            const temp = this.q[this.maxPointer]
            this.q[this.maxPointer] = temp.next
            while (this.q[this.maxPointer] === null) {
                this.maxPointer--
            }
        }
    }

    peek() {
        if (this.maxPointer !== -1) {
            return this.q[this.maxPointer]
        } else {
            return null
        }
    }

    // needs    Cell[0][0].Min_score (positionDiff)
    //          (Cell[p1][p2] === undefined ? 0 : Cell[p1][p2].Min_score) (upperLimit)
    insert(p1, p2, type_total, next_type, next_lower, next_upper, positionDiff, upperLimit) {
        let inserted = false
        let position = next_upper - positionDiff
        if (position >= 0) {
            const newnode = this.newNode(p1, p2, next_type, type_total, next_lower, null)
            if (this.maxPointer === -1) {
                this.q[position] = newnode
                newnode.next = null
                this.maxPointer = position
            } else {
                if (this.q[position] == null) {
                    this.q[position] = newnode
                    newnode.next = null
                    if (position > this.maxPointer) {
                        this.maxPointer = position
                    }
                } else {
                    let p = this.q[position]
                    let prev = null
                    while (p != null) {
                        if (p.chMin_score <= upperLimit) {
                            if (prev === null) {
                                this.q[position] = newnode
                                newnode.next = p
                            } else {
                                prev.next = newnode
                                newnode.next = p
                            }
                            inserted = true
                            break
                        } else {
                            prev = p
                            p = p.next
                        }
                    }
                    if (inserted === false) {
                        prev.next = newnode
                        newnode.next = null
                    }
                }
            }
        }
    }
}