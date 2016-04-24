/*jshint strict: true, esnext: true, node: true*/
"use strict";
const Wreck = require("Wreck");
const qs = require("querystring");

class FBMessenger {
    constructor(token) {
        this._fbBase = "https://graph.facebook.com/v2.6/me/";
        this._token = token;
        this._q = qs.stringify({access_token: token});
        this._wreck = Wreck.defaults({
            baseUrl: this._fbBase
        });
    }
    
    sendMessage(userid, msg) {
        let payload = "";
        payload = JSON.stringify({
            recipient: { id: userid },
            message: msg
        });
        return new Promise(function(resolve, reject) {
            this._wreck.request(
                "POST",
                `/messages?${this._q}`,
                {
                    payload: payload
                },
                (err, response) => {
                    if(err) {
                        return reject(err);
                    }
                    if(response.body.error) {
                        return reject(response.body.error);
                    }
                    return resolve(response.body);
                }
            );
        });
    }
}

module.exports = FBMessenger;
