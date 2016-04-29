/*jshint strict: true, esnext: true, node: true*/
"use strict";
const Wreck = require("wreck");
const qs = require("querystring");

class FBMessenger {
    constructor(token) {
        this._fbBase = "https://graph.facebook.com/v2.6/";
        this._token = token;
        this._q = qs.stringify({access_token: token});
        this._wreck = Wreck.defaults({
            baseUrl: this._fbBase
        });
    }
    
    sendMessage(userid, msg, token) {
        let payload = "";
        let q = qs.stringify({access_token: token || this._token});
        payload = JSON.stringify({
            recipient: { id: userid + "" },
            message: msg
        });
        console.log("payload: ", payload);
        return this._makeRequest(`/me/messages?${this._q}`,payload);
    }
    
    getUserProfile(userid, fields, token) {
        let params = {
            access_token: token || this._token
        };
        let q = "";
        fields = (Array.isArray(fields)) ? fields.join(",") : fields;
        if(fields) {
            params.fields = fields;
        }
        q = qs.stringify(params);
        return this._makeRequest(`/${userid}?${q}`);
    }
    
    _makeRequest(url, payload) {
        let method = "GET";
        let opts = {};
        if(payload) {
            method = "POST";
            opts.payload = payload;
            opts.headers = {
                'Content-Type': 'application/json',
                'Content-Length': payload.length
            };
        }
        return new Promise((resolve, reject) => {
            this._wreck.request(
                method,
                url,
                opts,
                (err, response) => {
                    if(err) {
                        return reject(err);
                    }
                    this._wreck.read(response,null, (err,payload) => {
                        if(err) {
                            return reject(err);
                        }
                        if(Buffer.isBuffer(payload)) {
                            payload = JSON.parse(payload.toString());
                        }
                        if(payload.error) {
                            return reject(payload.error);
                        }
                        return resolve(payload);
                    });
                }
            );
        });
    }
}

module.exports = FBMessenger;
