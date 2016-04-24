/*jshint strict: true, esnext: true, node: true*/
"use strict";
const Hapi = require('hapi');
const Memcached = require('memcached');
const FBMessenger = require('./messenger');
const fbconfig = require('./fbconfig.json');

//let mem;
//if(process.env.MEMCACHE_PORT_11211_TCP_ADDR && 
//   process.env.MEMCACHE_PORT_11211_TCP_PORT) {
//    let memconnection = `${process.env.MEMCACHE_PORT_11211_TCP_ADDR}:${process.env.MEMCACHE_PORT_11211_TCP_PORT}`;
//    mem = new Memcached(memconnection);
//} else {
//    // No memcache. Use Map for local testing.
//    Map.prototype.del = Map.prototype.delete;
//    mem = new Map();
//}

const server = new Hapi.Server();
server.connection({
    host: '0.0.0.0',
    port: process.env.PORT || 8080
});

function main(request, reply) {
    let req_obj = {};
    if(typeof request.payload === 'string') {
        req_obj = JSON.parse(request.payload);
    } else {
        req_obj = request.payload;
    }
    switch(request.param.action) {
        case "auth":
            break;
        case "message":
            break;
        case "delivery":
            break;
        case "postback":
            break;
        default:
            return reply("Not Found").code(404);
    }
}

server.route([
    {
        method: '*',
        path: '/',
        handler: (request, reply) => {
            reply("Hello World");
        }
    },
    {
        method: '*',
        path: '/brew',
        handler: (request, reply) => {
            reply("I'm a teapot").code(418);
        }
    },
    {
        method: '*',
        path: '/statuscheck',
        handler: (request, reply) => {
            reply("OK");
        }
    },
    {
        method: 'GET',
        path: '/fb/{p*}',
        handler: (request, reply) => {
            if(request.query["hub.mode"] === 'subscribe') {
                let challange = request.query["hub.challange"];
                let verify_token = request.query["hub.verify_token"];
                if(verify_token === "I am token") {
                    return reply(challange);
                }
            }
            return reply("Not found").code(404);
        }
    },
    {
        method: 'POST',
        path: '/fb/{action}',
        handler: main
    }
]);

server.start(() => {
    console.log('Server running at:', server.info.uri);
});
