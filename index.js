/*jshint strict: true, esnext: true, node: true*/
"use strict";
const Hapi = require('hapi');
const Memcached = require('memcached');
const FakeMemcached = require('./fakememcached');
const FBMessenger = require('./messenger');
const fbconfig = require('./fbconfig.json');

let mem;
if(process.env.MEMCACHE_PORT_11211_TCP_ADDR && 
   process.env.MEMCACHE_PORT_11211_TCP_PORT) {
    let memconnection = `${process.env.MEMCACHE_PORT_11211_TCP_ADDR}:${process.env.MEMCACHE_PORT_11211_TCP_PORT}`;
    mem = new Memcached(memconnection);
} else {
    mem = new FakeMemcached();
}

const messenger = new FBMessenger(fbconfig.access_token);

const server = new Hapi.Server();
server.connection({
    host: '0.0.0.0',
    port: process.env.PORT || 8080
});

function process_auth(req_obj) {
    process.nextTick((entries) => {
        function processData(id, data) {
            mem.set(id, data);
            // hello data.name! I'm a parrot!
            let m = {
                text: `Hello ${data.name}! I'm a parrot!`
            };
            return messenger.sendMessage(id, m);
        }
        
        function noop() { return true; }
        
        function processError(err) {
            //should do something.
        }
        
        for(let i = 0; i < entries.length; i++) {
            let messages = entries[i].messaging;
            for(let j = 0; j < messages.length; j++) {
                let message = messages[j];
                // get user
                // send hello
                messenger.getUserProfile(message.sender.id)
                .then(processData.bind(this, message.sender.id))
                .then(noop.bind(this))
                .catch(processError.bind(this));
            }
        }
    }, req_obj.entry);
}

function process_message(req_obj) {
    process.nextTick((entries) => {
        function noop() { return true; }
        
        function processError(err) {
            //should do something.
        }
        
        for(let i = 0; i < entries.length; i++) {
            let messages = entries[i].messaging;
            for(let j = 0; j < messages.length; j++) {
                let message = messages[j];
                // echo
                let m = {
                    text: `(${message.message.seq}) You said: ${message.message.text}`
                };
                messenger.sendMessage(message.sender.id, m)
                .then(noop.bind(this))
                .catch(processError.bind(this));
            }
        }
    }, req_obj.entry);
}

function main(request, reply) {
    let req_obj = {};
    if(typeof request.payload === 'string') {
        req_obj = JSON.parse(request.payload);
    } else {
        req_obj = request.payload;
    }
    switch(request.param.action) {
        case "auth":
            process_auth(req_obj);
            break;
        case "message":
            process_message(req_obj);
            break;
        case "delivery":
            // ignore for now
            break;
        case "postback":
            // ignore for now
            break;
        default:
            return reply("Not Found").code(404);
    }
    reply("OK");
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
                if(verify_token === (fbconfig.verify_token || "I am not a robot")) {
                    return reply(challange);
                }
            }
            return reply("Hello?").code(200);
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
