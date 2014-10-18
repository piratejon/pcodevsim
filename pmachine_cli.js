"use strict";

var fs = require('fs');
var pmachine = require('./pmachine.js').pmachine;

var program_text = fs.readFileSync(process.argv[2], "utf8");

pmachine.init();
pmachine.reset(program_text.split('\n'));

var pmachine_stdout = pmachine.get_stdout_buffer();
var readlineSync = require('readline-sync');
pmachine.set_stdin_callback(function () {
    return readlineSync.question('stdin: ');
});

while (pmachine.get_vm_status() === "running") {
    pmachine.step();

    while (pmachine_stdout.length > 0) {
        process.stdout.write(pmachine_stdout[0]);
        pmachine_stdout.shift();
    }
}

process.stdout.write("Program terminated.");

