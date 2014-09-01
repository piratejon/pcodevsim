"use strict";
var jsdom, sys, fs, htmlparser, htmlStream, handler, parser;

jsdom = require('jsdom');
sys = require('sys');
fs = require('fs');
htmlparser = require("htmlparser");
htmlStream = fs.createReadStream(process.argv[2]);

handler = new htmlparser.DefaultHandler(function (error, dom) {
    if (!error) {
        console.log(dom);
    }
});

parser = new htmlparser.Parser(handler);

htmlStream.pipe(parser);

