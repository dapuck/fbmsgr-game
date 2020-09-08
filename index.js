/*jshint strict: true, esnext: true, node: true*/
"use strict";
const Hapi = require('@hapi/hapi');
const Memcached = require('memcached');
const FakeMemcached = require('./fakememcached');
const FBMessenger = require('./messenger');
const fbconfig = require('./fbconfig.json');
const winston = require('winston');
require('winston-gae');

const logger = new winston.Logger({
    levels: winston.config.GoogleAppEngine.levels,
    transports: [
        new winston.transports.GoogleAppEngine({
            level: 'emergency'
        })
    ]
});

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

function process_auth(message) {
    // get user
    // send hello
    messenger.getUserProfile(message.sender.id)
    .then((data) => {
        console.log("User profile", data);
        logger.info("User profile", data);
        mem.set(message.sender.id, data, 7200, (err) => {
            if(err) {
                return console.log(err);
            }
            console.log("Cached profile");
        });
        return messenger.sendMessage(message.sender.id,{ text: `Hello ${data.name}! I'm a parrot!` });
    })
    .then((data) => {
        console.log("Message sent", data);
        logger.info("Message sent", data);
        return true;
    })
    .catch((err) => {
        console.log(err);
        logger.error(err);
    });
}

function process_message(message) {
    console.log("Got message", message);
    let m = {
        text: `(${message.message.seq}) You said: ${message.message.text}`
    };
    mem.get(message.sender.id, (err,data) => {
        if(!data) {
            messenger.getUserProfile(message.sender.id)
            .then((data) => {
                console.log("User profile", data);
                mem.set(message.sender.id, data, 7200, (err) => {
                    if(err) {
                        return console.log(err);
                    }
                    console.log("Cached profile");
                });
            });
        }
    });
    messenger.sendMessage(message.sender.id, m)
    .then((data) => {
        console.log("Message sent", data);
        logger.info("Message sent", data);
        return true;
    })
    .catch((err) => {
        console.log(err);
        logger.error(err);
    });
}

function main(request, reply) {
    let req_obj = {};
    if(typeof request.payload === 'string') {
        req_obj = JSON.parse(request.payload);
    } else {
        req_obj = request.payload;
    }
    console.log("Recived request:",req_obj);
    logger.info("Recived request:",req_obj);
    process.nextTick((entries) => {
        for(let i = 0; i < entries.length; i++) {
            let messages = entries[i].messaging;
            for(let j = 0; j < messages.length; j++) {
                let message = messages[j];
                if(message.optin) {
                    //auth
                    process_auth(message);
                } else if(message.message) {
                    process_message(message);
                } else if(message.delivery) {
                    //nothing
                } else if(message.postback) {
                    //nothing
                } else {
                    //invalid
                }
            }
        }
    }, req_obj.entry);
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
                let challenge = request.query["hub.challenge"];
                let verify_token = request.query["hub.verify_token"].replace(/\+/g," ");
                if(verify_token === (fbconfig.verify_token || "I_am_not_a_robot")) {
                    return reply(challenge);
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
