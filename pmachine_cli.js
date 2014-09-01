
var fs = require('fs');
var pmachine = require('./pmachine.js').pmachine;

var stdout = [];
var program_text = fs.readFileSync(process.argv[2], "utf8");

pmachine.init(null, stdout.push);

pmachine.reset(program_text.split('\n'));

while (pmachine.state() === "running") {
    pmachine.step();
    while (stdout.length > 0) {
        console.log(stdout[0]);
        stdout.shift();
    }
}

