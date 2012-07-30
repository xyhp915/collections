
var Map = require("./map");

var map = new Map();
map.set('a', 10);
map.set('b', 20);
console.log(map.keys());

var map = new Map();
var a = {}, b = {}, c = {};
map.set(a, 10);
map.set(b, 20);
map.set(c, 30);
console.log(map.get(b));
map.log();

map.forEach(function (value, key) {
    console.log(key + ': ' + value);
});

map.delete(a);
console.log(map.values());

console.log('\nclone');
console.log(map.clone().items());
