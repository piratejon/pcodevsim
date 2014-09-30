"use strict";

var fs = require('fs');
var pmachine = require('./pmachine.js').pmachine;

var program_text = fs.readFileSync(process.argv[2], "utf8");

pmachine.init();
pmachine.reset(program_text.split('\n'));

var pmachine_stdout = pmachine.stdout_buffer();
pmachine.set_stdin_callback(function () {
    var len, buffer;
    len = 100;
    buffer = new Buffer(len);
    fs.readSync(process.stdin.fd, buffer, 0, len);
    return buffer;
});

process.stdin.resume();

while (pmachine.state() === "running") {
    pmachine.step();

    while (pmachine_stdout.length > 0) {
        process.stdout.write(pmachine_stdout[0]);
        pmachine_stdout.shift();
    }
}

process.stdout.write("Program terminated.");

process.stdin.pause();

