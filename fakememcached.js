/*jshint strict: true, esnext: true, node: true*/
"use strict";

class FakeMemcached {
    constructor() {
        this.map = new Map();
        this.gets = this.get;
    }
    
    touch(key, lifetime, cb) {
        process.nextTick(cb);
    }
    
    get(key, cb) {
        let val = this.map.get(key);
        let err = (!val) ? "Not found" : null;
        process.nextTick(cb,err,val);
    }
    
    set(key, value, lifetime, cb) {
        let err;
        this.map.set(key,value);
        process.nextTick(cb,err);
    }
}

module.exports = FakeMemcached;
