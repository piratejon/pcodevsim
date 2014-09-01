
var fs = require('fs');
var pmachine = require('./pmachine.js').pmachine;

var program_text = fs.readFileSync(process.argv[2], "utf8");

pmachine.init();
pmachine.reset(program_text.split('\n'));

while (pmachine.state() === "running") {
    pmachine.step();
    while (pmachine.stdout.length > 0) {
        process.stdout.write(stdout[0]);
        stdout.shift();
    }
}

