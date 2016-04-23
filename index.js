/*jshint strict: true, esnext: true, node: true*/
"use strict";
const Hapi = require('hapi');
const Memcached = require('memcached');

let mem;
if(process.env.MEMCACHE_PORT_11211_TCP_ADDR && 
   process.env.MEMCACHE_PORT_11211_TCP_PORT) {
    let memconnection = `${process.env.MEMCACHE_PORT_11211_TCP_ADDR}:${process.env.MEMCACHE_PORT_11211_TCP_PORT}`;
    mem = new Memcached(memconnection);
} else {
    // No memcache. Use Map for local testing.
    Map.prototype.del = Map.prototype.delete;
    mem = new Map();
}

const server = new Hapi.Server();
server.connection({
    host: '0.0.0.0',
    port: process.env.PORT || 8080
});


