"use strict";

module.exports = SortedSet;

require("./object");
var Reducible = require("./reducible");
var Observable = require("./observable");
var TreeLog = require("./tree-log");

function SortedSet(values, equals, compare, content) {
    if (!(this instanceof SortedSet)) {
        return new SortedSet(values, equals, compare);
    }
    this.contentEquals = equals || Object.equals;
    this.contentCompare = compare || Object.compare;
    this.content = content || Function.noop;
    this.root = null;
    this.length = 0;
    this.addEach(values);
}

SortedSet.prototype.constructClone = function (values) {
    return new this.constructor(
        values,
        this.contentEquals,
        this.contentCompare,
        this.content
    );
};

SortedSet.prototype.has = function (value) {
    if (this.root) {
        this.splay(value);
        return this.contentEquals(value, this.root.value);
    } else {
        return false;
    }
};

SortedSet.prototype.get = function (value) {
    if (this.root) {
        this.splay(value);
        if (this.contentEquals(value, this.root.value)) {
            return this.root.value;
        }
    }
    return this.content(value);
};

SortedSet.prototype.add = function (value) {
    var node = new this.Node(value);
    if (this.root) {
        this.splay(value);
        if (!this.contentEquals(value, this.root.value)) {
            if (this.isObserved) {
                this.dispatchBeforeContentChange([value], []);
            }
            if (this.contentCompare(value, this.root.value) < 0) {
                // rotate right
                //   R        N
                //  / \  ->  / \
                // l   r    l   R
                // :   :    :    \
                //                r
                //                :
                node.right = this.root;
                node.left = this.root.left;
                this.root.left = null;
            } else {
                // rotate left
                //   R        N
                //  / \  ->  / \
                // l   r    R   r
                // :   :   /    :
                //        l
                //        :
                node.left = this.root;
                node.right = this.root.right;
                this.root.right = null;
            }
            this.root = node;
            this.length++;
            if (this.isObserved) {
                this.dispatchContentChange([value], []);
            }
            return true;
        }
    } else {
        if (this.isObserved) {
            this.dispatchBeforeContentChange([value], []);
        }
        this.root = node;
        this.length++;
        if (this.isObserved) {
            this.dispatchContentChange([value], []);
        }
        return true;
    }
    return false;
};

SortedSet.prototype['delete'] = function (value) {
    if (this.root) {
        this.splay(value);
        if (this.contentEquals(value, this.root.value)) {
            if (!this.root.left) {
                this.root = this.root.right;
            } else {
                // remove the right side of the tree,
                var right = this.root.right;
                this.root = this.root.left;
                // the tree now only contains the left side of the tree, so all
                // values are less than the value deleted.
                // splay so that the root has an empty right child
                this.splay(value);
                // put the right side of the tree back
                this.root.right = right;
            }
            this.length--;
            if (this.isObserved) {
                this.dispatchContentChange([], [value]);
            }
            return true;
        }
    }
    return false;
};

SortedSet.prototype.find = function (value) {
    if (this.root) {
        this.splay(value);
        if (this.contentEquals(value, this.root.value)) {
            return this.root;
        }
    }
};

SortedSet.prototype.findGreatest = function (at) {
    if (this.root) {
        at = at || this.root;
        while (at.right) {
            at = at.right;
        }
        return at;
    }
};

SortedSet.prototype.findLeast = function (at) {
    if (this.root) {
        at = at || this.root;
        while (at.left) {
            at = at.left;
        }
        return at;
    }
};

SortedSet.prototype.findGreatestLessThanOrEqual = function (value) {
    if (this.root) {
        this.splay(value);
        // assert root.value <= value
        return this.root;
    }
};

SortedSet.prototype.findGreatestLessThan = function (value) {
    if (this.root) {
        this.splay(value);
        // assert root.value <= value
        return this.root.getPrevious();
    }
};

SortedSet.prototype.findLeastGreaterThanOrEqual = function (value) {
    if (this.root) {
        this.splay(value);
        // assert root.value <= value
        var comparison = this.contentCompare(value, this.root.value);
        if (comparison === 0) {
            return this.root;
        } else {
            return this.root.getNext();
        }
    }
};

SortedSet.prototype.findLeastGreaterThan = function (value) {
    if (this.root) {
        this.splay(value);
        // assert root.value <= value
        var comparison = this.contentCompare(value, this.root.value);
        return this.root.getNext();
    }
};

SortedSet.prototype.pop = function () {
    if (this.root) {
        var found = this.findGreatest();
        this["delete"](found.value);
        return found.value;
    }
};

SortedSet.prototype.shift = function () {
    if (this.root) {
        var found = this.findLeast();
        this["delete"](found.value);
        return found.value;
    }
};

SortedSet.prototype.push = function () {
    this.addEach(arguments);
};

SortedSet.prototype.unshift = function () {
    this.addEach(arguments);
};

// This is the simplified top-down splaying algorithm from: "Self-adjusting
// Binary Search Trees" by Sleator and Tarjan
// guarantees that the root.value <= value if root exists
SortedSet.prototype.splay = function (value) {
    var stub, left, right, temp, root;

    if (!this.root) {
        return;
    }

    stub = left = right = new this.Node();
    root = this.root;

    while (true) {
        var comparison = this.contentCompare(value, root.value);
        if (comparison < 0) {
            if (root.left) {
                if (this.contentCompare(value, root.left.value) < 0) {
                    // rotate right
                    temp = root.left;
                    root.left = temp.right;
                    temp.right = root;
                    root = temp;
                    if (!root.left) {
                        break;
                    }
                }
                // link right
                right.left = root;
                right = root;
                root = root.left;
            } else {
                break;
            }
        } else if (comparison > 0) {
            if (root.right) {
                if (this.contentCompare(value, root.right.value) > 0) {
                    // rotate left
                    temp = root.right;
                    root.right = temp.left;
                    temp.left = root;
                    root = temp;
                    if (!root.right) {
                        break;
                    }
                }
                // link left
                left.right = root;
                left = root;
                root = root.right;
            } else {
                break;
            }
        } else { // equal or incomparable
            break;
        }
    }

    // assemble
    left.right = root.left;
    right.left = root.right;
    root.left = stub.right;
    root.right = stub.left;
    this.root = root;
};

SortedSet.prototype.reduce = function (callback, basis, thisp) {
    if (this.root) {
        basis = this.root.reduce(callback, basis, thisp, this);
    }
    return basis;
};

SortedSet.prototype.reduceRight = function (callback, basis, thisp) {
    if (this.root) {
        basis = this.root.reduceRight(callback, basis, thisp, this);
    }
    return basis;
};

SortedSet.prototype.addEach = Reducible.addEach;
SortedSet.prototype.forEach = Reducible.forEach;
SortedSet.prototype.map = Reducible.map;
SortedSet.prototype.toArray = Reducible.toArray;
SortedSet.prototype.filter = Reducible.filter;
SortedSet.prototype.every = Reducible.every;
SortedSet.prototype.some = Reducible.some;
SortedSet.prototype.all = Reducible.all;
SortedSet.prototype.any = Reducible.any;
SortedSet.prototype.sum = Reducible.sum;
SortedSet.prototype.average = Reducible.average;
SortedSet.prototype.concat = Reducible.concat;
SortedSet.prototype.flatten = Reducible.flatten;
SortedSet.prototype.zip = Reducible.flatten;
SortedSet.prototype.sorted = Reducible.sorted;
SortedSet.prototype.clone = Reducible.clone;

SortedSet.prototype.getContentChangeDescriptor = Observable.getContentChangeDescriptor;
SortedSet.prototype.addContentChangeListener = Observable.addContentChangeListener;
SortedSet.prototype.removeContentChangeListener = Observable.removeContentChangeListener;
SortedSet.prototype.dispatchContentChange = Observable.dispatchContentChange;
SortedSet.prototype.addBeforeContentChangeListener = Observable.addBeforeContentChangeListener;
SortedSet.prototype.removeBeforeContentChangeListener = Observable.removeBeforeContentChangeListener;
SortedSet.prototype.dispatchBeforeContentChange = Observable.dispatchBeforeContentChange;

SortedSet.prototype.min = function (at) {
    var least = this.findLeast(at);
    if (least) {
        return least.value;
    }
};

SortedSet.prototype.max = function (at) {
    var greatest = this.findGreatest(at);
    if (greatest) {
        return greatest.value;
    }
};

SortedSet.prototype.one = function () {
    if (!this.root) {
        throw new Error("Can't get one value from empty set");
    }
    return this.root.value;
};

SortedSet.prototype.only = function () {
    if (!this.root) {
        throw new Error("Can't get only value in empty set");
    }
    if (this.root.left || this.root.right) {
        throw new Error("Can't get only value in set with multiple values");
    }
    return this.root.value;
};

SortedSet.prototype.clear = function () {
    this.root = null;
};

SortedSet.prototype.iterate = function (start, end) {
    return new this.Iterator(this, start, end);
};

SortedSet.prototype.Iterator = Iterator;

SortedSet.prototype.summary = function () {
    if (this.root) {
        return this.root.summary();
    } else {
        return "()";
    }
};

SortedSet.prototype.log = function (charmap, logNode, callback, thisp) {
    charmap = charmap || TreeLog.unicodeRound;
    logNode = logNode || this.logNode;
    if (!callback) {
        callback = console.log;
        thisp = console;
    }
    callback = callback.bind(thisp);
    if (this.root) {
        this.root.log(charmap, logNode, callback, callback);
    }
};

SortedSet.prototype.logNode = function (node, write, writeBefore) {
    write(" " + node.value);
};

SortedSet.logCharsets = TreeLog;

SortedSet.prototype.Node = Node;

function Node(value) {
    this.value = value;
    this.left = null;
    this.right = null;
}

// TODO case where no basis is provided for reduction

Node.prototype.reduce = function (callback, basis, thisp, tree, depth) {
    depth = depth || 0;
    if (this.left) {
        basis = this.left.reduce(callback, basis, thisp, tree, depth + 1);
    }
    basis = callback.call(thisp, basis, this.value, this, tree, depth);
    if (this.right) {
        basis = this.right.reduce(callback, basis, thisp, tree, depth + 1);
    }
    return basis;
};

Node.prototype.reduceRight = function (callback, basis, thisp, tree, depth) {
    depth = depth || 0;
    if (this.right) {
        basis = this.right.reduce(callback, basis, thisp, tree, depth + 1);
    }
    basis = callback.call(thisp, basis, this.value, this, tree, depth);
    if (this.left) {
        basis = this.left.reduce(callback, basis, thisp, tree, depth + 1);
    }
    return basis;
};

// ge the next node in this subtree
Node.prototype.getNext = function () {
    var node = this;
    if (node.right) {
        node = node.right;
        while (node.left) {
            node = node.left;
        }
        return node;
    }
};

// ge the previous node in this subtree
Node.prototype.getPrevious = function () {
    var node = this;
    if (node.left) {
        node = node.left;
        while (node.right) {
            node = node.right;
        }
        return node;
    }
};

Node.prototype.summary = function () {
    var value = this.value || "-";
    value += " <" + this.length;
    if (!this.left && !this.right) {
        return "(" + value + ")";
    }
    return "(" + value + " " + (
        this.left ? this.left.summary() : "()"
    ) + ", " + (
        this.right ? this.right.summary() : "()"
    ) + ")";
};

Node.prototype.log = function (charmap, logNode, write, writeAbove) {
    var self = this;

    var branch;
    if (this.left && this.right) {
        branch = charmap.intersection;
    } else if (this.left) {
        branch = charmap.branchUp;
    } else if (this.right) {
        branch = charmap.branchDown;
    } else {
        branch = charmap.through;
    }

    var writtenAbove;
    this.left && this.left.log(
        charmap,
        logNode,
        function innerWrite(line) {
            if (!writtenAbove) {
                writtenAbove = true;
                // leader
                writeAbove(charmap.fromBelow + charmap.through + line);
            } else {
                // below
                writeAbove(charmap.strafe + " " + line);
            }
        },
        function innerWriteAbove(line) {
            // above
            writeAbove("  " + line);
        }
    );

    var writtenOn;
    logNode(
        this,
        function innerWrite(line) {
            if (!writtenOn) {
                writtenOn = true;
                write(branch + line);
            } else {
                write((self.right ? charmap.strafe : " ") + line);
            }
        },
        function innerWriteAbove(line) {
            writeAbove((self.left ? charmap.strafe : " ") + line);
        }
    );

    var writtenBelow;
    this.right && this.right.log(
        charmap,
        logNode,
        function innerWrite(line) {
            if (!writtenBelow) {
                writtenBelow = true;
                write(charmap.fromAbove + charmap.through + line);
            } else {
                write("  " + line);
            }
        },
        function innerWriteAbove(line) {
            write(charmap.strafe + " " + line);
        }
    );
};

function Iterator(set, start, end) {
    this.set = set;
    this.prev = null;
    this.end = end;
    if (start) {
        var next = this.set.findLeastGreaterThanOrEqual(start);
        if (next) {
            this.set.splay(next.value);
            this.prev = next.getPrevious();
        }
    }
}

Iterator.prototype.next = function () {
    var next;
    if (this.prev) {
        next = this.set.findLeastGreaterThan(this.prev.value);
    } else {
        next = this.set.findLeast();
    }
    if (!next) {
        throw StopIteration;
    }
    if (
        this.end !== undefined &&
        this.set.contentCompare(next.value, this.end) >= 0
    ) {
        throw StopIteration;
    }
    this.prev = next;
    return next.value;
};

