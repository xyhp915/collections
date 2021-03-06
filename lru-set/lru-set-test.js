/* global describe, it, expect */
"use strict";

var sinon = require("sinon");
var LruSet = require("@collections/lru-set");
var describeCollection = require("../specs/collection");
var describeSet = require("../specs/set");

describe("LruSet", function () {

    // construction, has, add, get, delete
    function newLruSet(values) {
        return new LruSet(values);
    }

    [LruSet, newLruSet].forEach(function (LruSet) {
        describeCollection(LruSet, [1, 2, 3, 4], true);
        describeCollection(LruSet, [{id: 0}, {id: 1}, {id: 2}, {id: 3}], true);
        describeSet(LruSet);
    });

    it("removes stale entries", function () {
        var set = LruSet([4, 3, 1, 2, 3], 3);
        expect(set.length).toBe(3);
        set.add(3);
        expect(set.toArray()).toEqual([1, 2, 3]);
        set.add(4);
        expect(set.toArray()).toEqual([2, 3, 4]);
    });

    it("emits LRU changes as singleton operation", function () {
        var a = 1, b = 2, c = 3, d = 4;
        var lruset = LruSet([d, c, a, b, c], 3);
        lruset.observeRangeChange(function(plus, minus) {
            expect(plus).toEqual([d]);
            expect(minus).toEqual([a]);
        });
        expect(lruset.add(d)).toBe(false);
    });

    it("dispatches LRU changes as singleton operation", function () {
        var set = LruSet([4, 3, 1, 2, 3], 3);
        var spy = sinon.spy();
        set.observeRangeWillChange(function (plus, minus) {
            spy("before-plus", plus);
            spy("before-minus", minus);
        });
        set.observeRangeChange(function (plus, minus) {
            spy("after-plus", plus);
            spy("after-minus", minus);
        });
        expect(set.add(4)).toBe(false);
        expect(spy.args).toEqual([
            ["before-plus", [4]],
            ["before-minus", [1]],
            ["after-plus", [4]],
            ["after-minus", [1]]
        ]);
    });
});
