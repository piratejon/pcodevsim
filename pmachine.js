/*jslint browser:true */

var pmachine = (function () {
    "use strict";

    var G, Logger;

    Logger = (function () {
        var H;

        function log(entry) {
            H.target_buffer.value += '\n' + entry;
        }

        function reset() {
            // H.target_buffer.value = "";
        }

        function init() {
            H = {};
            H.target_buffer = document.getElementById('logger');
            reset();
        }

        init();

        return { 'reset': reset, 'init': init, 'log': log };
    }());

    function init(logger) {
        G = {};
        G.R = {
            pc: 0,
            sp: 0,
            mp: 0,
            np: 0,
            ep: 0
        };
        G.istore = {};
        G.dstore = {};
        G.line_labels = {};
        G.line_labels_rev = {};
        G.data_labels = {};
        G.data_labels_rev = {};
        G.implicit_label_matcher = /^(L\d+)/;
        G.explicit_label_matcher = /^#define[ \t]+(L\d+)[ \t]+(\d+)/;
        G.instruction_matcher = /^([A-Za-z0-9]{0,10})?[ \t]*([A-Za-z0-9]{0,10})?[ \t]*([A-Za-z0-9]{0,10})?[ \t]*([A-Za-z0-9]*)?[ \t]*$/;
        G.log = console.log;
    }

    function defines_explicit_label(line) {
        return G.explicit_label_matcher.test(line);
    }

    function insert_code_label(i, insn) {
        var scan = G.implicit_label_matcher.exec(insn.label);
        G.line_labels[scan[1]] = i;
        G.line_labels_rev[i] = scan[1];
        G.log("Stored code label " + scan[1] + "->" + i);
    }

    function insert_explicit_label(line) {
        var scan = G.explicit_label_matcher.exec(line);
        G.data_labels[scan[1]] = scan[2];
        G.data_labels_rev[scan[2]] = scan[1];
        G.log("Stored data label " + scan[1] + "->" + scan[2]);
    }

    function scan_instruction(i, line) {
        var scan = G.instruction_matcher.exec(line);
        return {
            address: i,
            label: scan[1],
            opcode: scan[2],
            op1: scan[3],
            op2: scan[4]
        };
    }

    function instruction_array_from_pcode() {
        var line, pcode, istore, actual_line_number, insn;

        pcode = document.getElementById('pcode').value.split("\n");
        istore = new Array(pcode.length); // so a hard-coded length is ok? :(

        actual_line_number = 0;
        for (line in pcode) {
            if (pcode.hasOwnProperty(line)) {
                if (defines_explicit_label(pcode[line])) {
                    insert_explicit_label(pcode[line]);
                } else {
                    insn = scan_instruction(actual_line_number, pcode[line]);

                    if (insn.label !== undefined) {
                        insert_code_label(actual_line_number, insn);
                    }

                    if (insn.opcode !== undefined) {
                        istore[actual_line_number] = insn;
                        actual_line_number += 1;
                    }
                }
            }
        }

        return istore;
    }

    function instruction_table_row(insn) {
        var tr, td;

        tr = document.createElement('tr');

        td = document.createElement('td');
        td.innerHTML = insn.address;
        tr.appendChild(td);

        td = document.createElement('td');
        td.innerHTML = insn.opcode === undefined ? '' : insn.opcode;
        tr.appendChild(td);

        td = document.createElement('td');
        td.innerHTML = insn.op1 === undefined ? '' : insn.op1;
        tr.appendChild(td);

        td = document.createElement('td');
        td.innerHTML = insn.op2 === undefined ? '' : insn.op2;
        tr.appendChild(td);

        return tr;
    }

    function render_istore(istore) {
        var istore_table, insn;

        istore_table = document.getElementById('istore_body');
        while (istore_table.hasChildNodes()) {
            istore_table.removeChild(istore_table.lastChild);
        }

        for (insn in istore) {
            if (istore.hasOwnProperty(insn)) {
                istore_table.appendChild(instruction_table_row(istore[insn]));
            }
        }
    }

    function render_registers(r) {
        var reg;
        for (reg in r) {
            if (r.hasOwnProperty(reg)) {
                document.getElementById('val_' + reg).innerHTML = r[reg];
            }
        }
    }

    function infer_initial_program_counter(istore) {
        var i;

        i = istore.length - 1;

        for (i = istore.length - 1; i >= 0; i -= 1) {
            console.log(i);
            if (istore[i] !== undefined) {
                console.log(istore[i].opcode);
                if (istore[i].opcode === "mst") {
                    return i;
                }
            }
        }

        return -1;
    }

    function render_labels(g) {
        var wrap, tbody, label;

        wrap = function (l, v) {
            var tr, td;

            tr = document.createElement('tr');

            td = document.createElement('td');
            td.innerHTML = l;
            tr.appendChild(td);

            td = document.createElement('td');
            td.innerHTML = v;
            tr.appendChild(td);

            return tr;
        };

        tbody = document.getElementById('label_body');

        for (label in g.line_labels) {
            if (g.line_labels.hasOwnProperty(label)) {
                tbody.appendChild(wrap(label, g.line_labels[label]));
            }
        }

        for (label in g.data_labels) {
            if (g.data_labels.hasOwnProperty(label)) {
                tbody.appendChild(wrap(label, g.data_labels[label]));
            }
        }
     }

    function load() {
        G.istore = instruction_array_from_pcode();
        G.R.pc = infer_initial_program_counter(G.istore);
        render_istore(G.istore);
        render_registers(G.R);
        render_labels(G);
    }

    return { 'init': init, 'load': load };
}());

