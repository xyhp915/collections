/* global describe, it, expect */
"use strict";

var Set = require("@collections/set");
var Map = require("@collections/map");

var cloneOperator = require("../pop-clone");
var equalsOperator = require("pop-equals");

describe("clone", function () {

    it("deeply clones custom collections", function () {
        var a = Set([Map({a: {}})]);
        var b = cloneOperator(a);

        // equal maps are not consistently hashed
        expect(equalsOperator(a, b)).toBe(false);
        expect(a.equals(b)).toBe(false);

        expect(a.one()).not.toBe(b.one());
        expect(a.one().equals(b.one())).toBe(true);
        expect(a.one().get("a")).not.toBe(b.one().get("a"));
        expect(a.one().get("a")).toEqual(b.one().get("a"));
    });

    var graph = {
        object: {a: 10},
        array: [1, 2, 3],
        string: "hello",
        number: 10,
        nestedObject: {
            a: {a1: 10, a2: 20},
            b: {b1: "a", b2: "c"}
        },
        nestedArray: [
            [1, 2, 3],
            [4, 5, 6]
        ],
        mixedObject: {
            array: [1, 3, 4],
            object: {a: 10, b: 20}
        },
        mixedArray: [
            [],
            {a: 10, b: 20}
        ],
        arrayWithHoles: [],
        clonable: Object.create({
            clone: function () {
                return this;
            }
        })
    };

    graph.cycle = graph;
    graph.arrayWithHoles[10] = 10;

    // Not reflexively equal, not equal to clone
    //graph.typedObject = Object.create(null);
    //graph.typedObject.a = 10;
    //graph.typedObject.b = 10;

    Object.keys(graph).forEach(function (name) {
        var value = graph[name];
        it(name + " cloned equals self", function () {
            expect(cloneOperator(value)).toEqual(value);
        });
    });

    it("should clone zero levels of depth", function () {
        var clone = cloneOperator(graph, 0);
        expect(clone).toBe(graph);
    });

    it("should clone object at one level of depth", function () {
        var clone = cloneOperator(graph, 1);
        expect(clone).toEqual(graph);
        expect(clone).not.toBe(graph);
    });

    it("should clone object at two levels of depth", function () {
        var clone = cloneOperator(graph, 2);
        expect(clone).toEqual(graph);
        expect(clone.object).not.toBe(graph.object);
        expect(clone.object).toEqual(graph.object);
        expect(clone.nestedObject.a).toBe(graph.nestedObject.a);
    });

    it("should clone array at two levels of depth", function () {
        var clone = cloneOperator(graph, 2);
        expect(clone).toEqual(graph);
    });

    it("should clone identical values at least once", function () {
        var clone = cloneOperator(graph);
        expect(clone.cycle).not.toBe(graph.cycle);
    });

    it("should clone identical values only once", function () {
        var clone = cloneOperator(graph);
        expect(clone.cycle).toBe(clone);
    });

    it("should clone clonable", function () {
        var clone = cloneOperator(graph);
        expect(clone.clonable).toBe(graph.clonable);
    });

    it("should clone an object with a function property", function () {
        var original = {foo: function () {}};
        var clone = cloneOperator(original);
        expect(clone.foo).toBe(original.foo);
        expect(equalsOperator(clone, original)).toBe(true);
    });

    var object = {a: {a1: 10, a2: 20}, b: {b1: 10, b2: 20}};

    it("should clone zero levels", function () {
        expect(cloneOperator(object, 0)).toBe(object);
    });

    it("should clone one level", function () {
        var clone = cloneOperator(object, 1);
        expect(clone).toEqual(object);
        expect(clone).not.toBe(object);
        expect(clone.a).toBe(object.a);
    });

    it("should clone two levels", function () {
        var clone = cloneOperator(object, 2);
        expect(clone).toEqual(object);
        expect(clone).not.toBe(object);
        expect(clone.a).not.toBe(object.a);
    });

    it("should clone with reference cycles", function () {
        var cycle = {};
        cycle.cycle = cycle;
        var clone = cloneOperator(cycle);
        expect(clone).toEqual(cycle);
        expect(clone).not.toBe(cycle);
        expect(clone.cycle).toBe(clone);
    });

});

it("delegates to clone method, with less depth", function () {
    var object = {
        child: {
            clone: function (depth, memo) {
                expect(memo.has(object)).toBe(true);
                expect(depth).toBe(1);
                return "hello";
            }
        }
    };
    var cloned = cloneOperator(object, 2);
    expect(cloned.child).toBe("hello");
});
