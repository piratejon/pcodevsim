
var export_me = function (exports) {
    "use strict";

    exports.pmachine = (function () {

        var G;

        function new_value(id, type, value) {
            return {id: id, type: type, value: value};
        }

        function datastore_push(g, id, type, value) {
            g.dstore.push(new_value(id, type, value));
            g.R.sp += 1;
        }

        function datastore_pop(g) {
            var popee = g.dstore[g.dstore.length - 1];
            g.dstore.pop();
            g.R.sp -= 1;
            return popee;
        }

        function get_frame_pointer(mp, v) {
            var offset_map = {
                "rv": 0,
                "sl": 1,
                "dl": 2,
                "ep": 3,
                "ra": 4
            };

            return mp + offset_map[v];
        }

        function get_frame_element(g, mp, v) {
            return g.dstore[get_frame_pointer(mp, v)];
        }

        function set_frame_element(g, mp, elt, value) {
            g.dstore[get_frame_pointer(mp, elt)].value = value;
        }

        // try to resolve l into a label or assume it's an address
        function int_from_label(g, l) {
            if (g.line_labels.hasOwnProperty(l)) {
                return parseInt(G.line_labels[l], 10);
            }

            if (g.data_labels.hasOwnProperty(l)) {
                return parseInt(G.data_labels[l], 10);
            }

            return parseInt(l, 10);
        }

        function follow_link(g, level, mp, frame_element) {
            if (level === 0) {
                return mp;
            }

            return follow_link(g, level - 1, g.dstore[get_frame_pointer(mp, frame_element)].value, frame_element);
        }

        function write_to_stdout(g, item) {
            g.stdout.push(item.toString());
        }

        function read_from_stdin(g) {
            return new_value("stdin", "", g.stdin_callback());
        }

        function init() {
            G = {};

            G.stdout = [];

            G.implicit_label_matcher = /^(L\d+)/;
            G.explicit_label_matcher = /^#define[ \t]+(L\d+)[ \t]+(\d+)/;
            G.instruction_matcher = /^([A-Za-z0-9]{0,10})?[ \t]*([A-Za-z0-9]{0,10})?[ \t]*([A-Za-z0-9]{0,10})?[ \t]*(.*)/;

            G.opcode_dispatch = {
                "mst": function (g, insn) {
                    datastore_push(g, "rv", "i", 0);
                    datastore_push(g, "sl", "i", follow_link(g, parseInt(insn.op1, 10), g.R.mp, "dl"));
                    datastore_push(g, "dl", "i", g.R.mp); // the dynamic link points to the callee's stack frame
                    datastore_push(g, "ep", "i", g.R.ep);
                    datastore_push(g, "ra", "a", "");

                    // these pushes had the effect of incrementing 5 times

                    g.R.pc += 1;
                },

                "cup": function (g, insn) {
                    g.R.mp = g.R.sp - (parseInt(insn.op1, 10) + 4);

                    set_frame_element(g, g.R.mp, "ra", g.R.pc + 1);

                    g.R.pc = int_from_label(g, insn.op2);
                },

                "stp": function (g, insn) {
                    g.running = false;
                },

                "ent": function (g, insn) {
                    if (insn.op1 === "sp") {
                        var new_space;

                        new_space = g.R.mp + int_from_label(g, insn.op2);

                        while (g.R.sp < new_space) {
                            datastore_push(g, "ent", "", 0);
                        }
                        // probably should like actually allocate this space lol?
                        // g.R.sp = g.R.mp + int_from_label(insn.op2);
                    } else if (insn.op1 === "ep") {
                        g.R.ep = g.R.sp + int_from_label(g, insn.op2);
                    }

                    g.R.pc += 1;
                },

                "rtn": function (g, insn) {
                    var old_mp = g.R.mp;

                    g.R.pc = get_frame_element(g, g.R.mp, "ra").value;
                    g.R.ep = get_frame_element(g, g.R.mp, "ep").value;
                    g.R.mp = get_frame_element(g, g.R.mp, "dl").value;

                    while (g.R.sp > old_mp) {
                        datastore_pop(g);
                    }
                },

                "lda": function (g, insn) {
                    // possibly overwrites parts of the stack frame!
                    datastore_push(g, "", "a", follow_link(g, parseInt(insn.op1, 10), g.R.mp, "dl") + parseInt(insn.op2, 10));

                    g.R.pc += 1;
                },

                "ldc": function (g, insn) {
                    if (insn.op1 === "c" || insn.op1 === "b") {
                        datastore_push(g, "", insn.op1, insn.op2);
                    } else {
                        datastore_push(g, "", insn.op1, g.constants[insn.op2].value);
                    }

                    g.R.pc += 1;
                },

                "csp": function (g, insn) {
                    var value, address;
                    switch (insn.op1) {
                    case "wln": // write line
                        write_to_stdout(g, datastore_pop(g).value + '\n');
                        break;

                    case "wrs": // write string
                    case "wri": // write integer

                        // TODO strip off the enclosing quotes
                        write_to_stdout(g, datastore_pop(g).value);
                        break;

                    case "rdr": // read integer
                        address = datastore_pop(g);
                        value = read_from_stdin(g);

                        value.type = "r";
                        value.label = "rdr";
                        value.value = parseFloat(value.value);

                        g.dstore[address.value] = value;
                        break;

                    case "rdi": // read integer
                        address = datastore_pop(g);
                        value = read_from_stdin(g);

                        value.type = "i";
                        value.label = "rdi";
                        value.value = parseInt(value.value, 10);

                        g.dstore[address.value] = value;
                        break;

                    case "rln":
                        break;

                    default:
                        throw ("Unimplemented instruction " + insn.op1);
                    }

                    g.R.pc += 1;
                },

                "sti": function (g, insn) {
                    var value, address;

                    value = datastore_pop(g);
                    address = datastore_pop(g);

                    g.dstore[address.value] = value;

                    g.R.pc += 1;
                },

                "lvc": function (g, insn) {
                    var offset;

                    offset = follow_link(g, parseInt(insn.op1, 10), g.R.mp, "sl") + parseInt(insn.op2, 10);

                    datastore_push(g, "", "c", g.dstore[offset].value);

                    g.R.pc += 1;
                },

                "lvb": function (g, insn) {
                    var offset;

                    offset = follow_link(g, parseInt(insn.op1, 10), g.R.mp, "sl") + parseInt(insn.op2, 10);

                    datastore_push(g, "", "b", g.dstore[offset].value);

                    g.R.pc += 1;
                },

                "lvi": function (g, insn) {
                    var offset;

                    offset = follow_link(g, parseInt(insn.op1, 10), g.R.mp, "sl") + parseInt(insn.op2, 10);

                    datastore_push(g, "", "i", g.dstore[offset].value);

                    g.R.pc += 1;
                },

                "equ": function (g, insn) {
                    var a, b;

                    a = datastore_pop(g);
                    b = datastore_pop(g);

                    datastore_push(g, "", "b", a.type === b.type && a.value === b.value);

                    g.R.pc += 1;
                },

                "fjp": function (g, insn) {
                    if (datastore_pop(g).value === false) {
                        g.R.pc = int_from_label(g, insn.op1);
                    } else {
                        g.R.pc += 1;
                    }
                },

                "mod": function (g, insn) {
                    var a, b;

                    a = parseInt(datastore_pop(g).value, 10);
                    b = parseInt(datastore_pop(g).value, 10);

                    datastore_push(g, "", "i", (b % a).toString());

                    g.R.pc += 1;
                },

                "ujp": function (g, insn) {
                    g.R.pc = int_from_label(g, insn.op1);
                },

                "lvr": function (g, insn) {
                    var offset;

                    offset = follow_link(g, parseInt(insn.op1, 10), g.R.mp, "sl") + parseInt(insn.op2, 10);

                    datastore_push(g, "", "r", g.dstore[offset].value);

                    g.R.pc += 1;
                },

                "les": function (g, insn) {
                    var a, b;

                    a = datastore_pop(g);
                    b = datastore_pop(g);

                    datastore_push(g, "", "b", b.value < a.value);

                    g.R.pc += 1;
                },

                "neq": function (g, insn) {
                    var a, b;

                    a = datastore_pop(g);
                    b = datastore_pop(g);

                    datastore_push(g, "", "b", b.value !== a.value);

                    g.R.pc += 1;
                },

                "grt": function (g, insn) {
                    var a, b;

                    a = datastore_pop(g);
                    b = datastore_pop(g);

                    datastore_push(g, "", "b", b.value > a.value);

                    g.R.pc += 1;
                },

                "leq": function (g, insn) {
                    var a, b;

                    a = datastore_pop(g);
                    b = datastore_pop(g);

                    datastore_push(g, "", "b", b.value <= a.value);

                    g.R.pc += 1;
                },

                "geq": function (g, insn) {
                    var a, b;

                    a = datastore_pop(g);
                    b = datastore_pop(g);

                    datastore_push(g, "", "b", b.value >= a.value);

                    g.R.pc += 1;
                },

                "dvi": function (g, insn) {
                    var a, b;

                    a = datastore_pop(g).value;
                    b = datastore_pop(g).value;

                    datastore_push(g, "", "i", b / a);

                    g.R.pc += 1;
                },

                "dvr": function (g, insn) {
                    var a, b;

                    a = datastore_pop(g).value;
                    b = datastore_pop(g).value;

                    datastore_push(g, "", "r", b / a);

                    g.R.pc += 1;
                },

                "mpi": function (g, insn) {
                    var a, b;

                    a = datastore_pop(g).value;
                    b = datastore_pop(g).value;

                    datastore_push(g, "", "i", b * a);

                    g.R.pc += 1;
                },

                "mpr": function (g, insn) {
                    var a, b;

                    a = datastore_pop(g).value;
                    b = datastore_pop(g).value;

                    datastore_push(g, "", "r", b * a);

                    g.R.pc += 1;
                },

                "inc": function (g, insn) {
                    var val;

                    val = datastore_pop(g);

                    datastore_push(g, "", val.type, val.value + 1);

                    g.R.pc += 1;
                },

                "adr": function (g, insn) {
                    var a, b;

                    a = parseInt(datastore_pop(g).value, 10);
                    b = parseInt(datastore_pop(g).value, 10);

                    datastore_push(g, "", "r", (b + a).toString());

                    g.R.pc += 1;
                },

                "adi": function (g, insn) {
                    var a, b;

                    a = parseInt(datastore_pop(g).value, 10);
                    b = parseInt(datastore_pop(g).value, 10);

                    datastore_push(g, "", "i", (b + a).toString());

                    g.R.pc += 1;
                },

                "sbi": function (g, insn) {
                    var a, b;

                    a = datastore_pop(g).value;
                    b = datastore_pop(g).value;

                    datastore_push(g, "", "i", b - a);

                    g.R.pc += 1;
                },

                "sbr": function (g, insn) {
                    var a, b;

                    a = datastore_pop(g).value;
                    b = datastore_pop(g).value;

                    datastore_push(g, "", "r", b - a);

                    g.R.pc += 1;
                },

                "xor": function (g, insn) {
                    var a, b;

                    a = datastore_pop(g).value;
                    b = datastore_pop(g).value;

                    datastore_push(g, "", "b", b ^ a);

                    g.R.pc += 1;
                },

                "ior": function (g, insn) {
                    var a, b;

                    a = datastore_pop(g).value;
                    b = datastore_pop(g).value;

                    datastore_push(g, "", "b", b | a);

                    g.R.pc += 1;
                },

                "and": function (g, insn) {
                    var a, b;

                    a = datastore_pop(g).value;
                    b = datastore_pop(g).value;

                    datastore_push(g, "", "b", b & a);

                    g.R.pc += 1;
                },

                "ixa": function (g, insn) {
                    var a, i, q;

                    a = datastore_pop(g).value;
                    i = datastore_pop(g).value;
                    q = parseInt(insn.op1, 10);

                    datastore_push(g, "", "i", (q * i) + a);

                    g.R.pc += 1;
                },

                "ngi": function (g, insn) {
                    var i;

                    i = datastore_pop(g).value;

                    datastore_push(g, "", "i", 0 - i);

                    g.R.pc += 1;
                },

                "not": function (g, insn) {
                    var b;

                    b = datastore_pop(g).value;

                    datastore_push(g, "", "b", !b);

                    g.R.pc += 1;
                },

                "ind": function (g, insn) {
                    var a;

                    a = datastore_pop(g).value;
                    datastore_push(g, "ind", insn.type, g.dstore[a].value);

                    g.R.pc += 1;
                },

                "dec": function (g, insn) {
                    var a, v;

                    v = datastore_pop(g);
                    a = parseInt(v.value, 10);
                    datastore_push(g, "", v.type, a - 1);

                    g.R.pc += 1;
                },

                "rnd": function (g, insn) {
                    var a, v;

                    v = datastore_pop(g);
                    a = parseFloat(v.value);
                    datastore_push(g, "", "i", Math.round(a));

                    g.R.pc += 1;
                },

                "sqt": function (g, insn) {
                    var a, v;
                    v = datastore_pop(g);
                    a = parseFloat(v.value);
                    datastore_push(g, "", v.type, Math.sqrt(a));

                    g.R.pc += 1;
                },

                "abr": function (g, insn) {
                    var a, v;
                    v = datastore_pop(g);
                    a = parseFloat(v.value);
                    datastore_push(g, "", v.type, Math.abs(a));

                    g.R.pc += 1;
                },

                "abi": function (g, insn) {
                    var a, v;
                    v = datastore_pop(g);
                    a = parseFloat(v.value);
                    datastore_push(g, "", v.type, Math.abs(a));

                    g.R.pc += 1;
                },

                "trc": function (g, insn) {
                    var a, v;
                    v = datastore_pop(g);
                    a = parseFloat(v.value);
                    if (a > 0) {
                        datastore_push(g, "", "i", Math.floor(a));
                    } else {
                        datastore_push(g, "", "i", Math.ceil(a));
                    }

                    g.R.pc += 1;
                },

                "chr": function (g, insn) {
                    var a, v;

                    v = datastore_pop(g);
                    a = parseInt(v.value, 10);
                    datastore_push(g, "", "c", String.fromCharCode(a));

                    g.R.pc += 1;
                },

                "ord": function (g, insn) {
                    var a, v;

                    v = datastore_pop(g);
                    a = v.value;
                    datastore_push(g, "", "i", a.charCodeAt(0));

                    g.R.pc += 1;
                },

                "flt": function (g, insn) {
                    var v;
                    v = datastore_pop(g);
                    datastore_push(g, "", "r", v.value);
                    g.R.pc += 1;
                },
            };
        }

        function defines_explicit_label(g, line) {
            return g.explicit_label_matcher.test(line);
        }

        function insert_code_label(g, i, insn) {
            var scan = g.implicit_label_matcher.exec(insn.label);
            g.line_labels[scan[1]] = i;
            g.line_labels_rev[i] = scan[1];
        }

        function insert_explicit_label(g, line) {
            var scan = g.explicit_label_matcher.exec(line);
            g.data_labels[scan[1]] = scan[2];
            g.data_labels_rev[scan[2]] = scan[1];
        }

        function insert_constant(g, insn) {
            var l = g.constants.length;
            g.constants.push({type: insn.op1, value: insn.op2});
            return l.toString();
        }

        function process_quotes(str) {
            // replace '' with ', and remove before-and-after quotes
            return str.replace("''", "'").replace(/^'/, "").replace(/'$/, "");
        }

        function scan_instruction(g, i, line) {
            var insn, scan;

            scan = g.instruction_matcher.exec(line);

            insn = {
                address: i,
                label: scan[1],
                opcode: scan[2],
                op1: scan[3],
                op2: process_quotes(scan[4].trim()).trim()
            };

            // check for and insert any constants found
            if (insn.opcode === "ldc" && insn.op1 !== "c" && insn.op1 !== "b") {
                insn.op2 = insert_constant(g, insn);
            }

            return insn;
        }

        function instruction_array_from_pcode(g, pcode) {
            var line, istore, actual_line_number, insn;

            g.line_labels = {};
            g.line_labels_rev = {};
            g.data_labels = {};
            g.data_labels_rev = {};
            g.constants = [];

            istore = [];

            actual_line_number = 0;
            for (line in pcode) {
                if (pcode.hasOwnProperty(line)) {
                    if (defines_explicit_label(g, pcode[line])) {
                        insert_explicit_label(g, pcode[line]);
                    } else {
                        insn = scan_instruction(g, actual_line_number, pcode[line]);

                        if (insn.label !== undefined) {
                            insert_code_label(g, actual_line_number, insn);
                        }

                        if (insn.opcode !== undefined) {
                            istore.push(insn);
                            actual_line_number += 1;
                        }
                    }
                }
            }

            return istore;
        }

        function infer_initial_program_counter(istore) {
            var i;

            i = istore.length - 1;

            for (i = istore.length - 1; i >= 0; i -= 1) {
                if (istore[i] !== undefined) {
                    if (istore[i].opcode === "mst") {
                        return i;
                    }
                }
            }

            // if there is no mark stack just start at the top
            return 0;
        }

        function initialize_registers(g) {
            g.R = {};
            g.R.pc = infer_initial_program_counter(g.istore);
            g.R.sp = -1;
            g.R.mp = 0;
            g.R.np = 32767;
            g.R.ep = 5;
        }

        function reset(pcode_text) {
            init();
            G.istore = instruction_array_from_pcode(G, pcode_text);
            G.dstore = [];
            initialize_registers(G);
            G.running = true;
        }

        function step() {
            var insn;

            insn = G.istore[G.R.pc];

            G.opcode_dispatch[insn.opcode](G, insn);
        }

        function get_vm_status() {
            if (G === undefined) {
                return "uninitialized";
            }

            if (G.running === true) {
                return "running";
            }

            return "halted";
        }

        function get_machine_state() {
            return G;
        }

        function get_stdout_buffer() {
            return G.stdout;
        }

        function set_stdin_callback(arg) {
            G.stdin_callback = arg;
        }

        return {
            'init': init,
            'step': step,
            'reset': reset,
            'get_vm_status': get_vm_status,
            'get_stdout_buffer': get_stdout_buffer,
            'get_machine_state': get_machine_state,
            'set_stdin_callback': set_stdin_callback
        };
    }());
};

var exports;
if (undefined === exports) {
    this.pmachine = {};
    export_me(this.pmachine);
} else {
    export_me(exports);
}

