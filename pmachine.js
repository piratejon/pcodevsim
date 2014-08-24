/*jslint browser:true */

var pmachine = (function () {
    "use strict";

    var G;

    function init() {
        G = {};
        G.R = {};
        G.istore = {};
        G.dstore = {};
        G.line_labels = {};
        G.line_labels_rev = {};
        G.data_labels = {};
        G.data_labels_rev = {};
        G.implicit_label_matcher = /^(L\d+)/;
        G.explicit_label_matcher = /^#define[ \t]+(L\d+)[ \t]+(\d+)/;
        G.instruction_matcher = /^([A-Za-z0-9]{0,10})?[ \t]*([A-Za-z0-9]{0,10})?[ \t]*([A-Za-z0-9]{0,10})?[ \t]*([A-Za-z0-9]*)?[ \t]*$/;
        // G.log = console.log;
        G.log = function () { };
        G.form = {}; // where we track the web view
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

    function instruction_table_row(insn, g) {
        var tr, td;

        tr = document.createElement('tr');
        if (insn.address === g.R.pc) {
            tr.id = "pc_row";
            g.form.pc_row = tr;
        }

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

    function render_istore(g) {
        var istore_table, insn;

        istore_table = document.getElementById('istore_body');
        while (istore_table.hasChildNodes()) {
            istore_table.removeChild(istore_table.lastChild);
        }

        for (insn in g.istore) {
            if (g.istore.hasOwnProperty(insn)) {
                istore_table.appendChild(instruction_table_row(g.istore[insn], g));
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
            if (istore[i] !== undefined) {
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

    function initialize_registers(g) {
        g.R.pc = infer_initial_program_counter(g.istore);
        g.R.sp = 0;
        g.R.mp = 0;
        g.R.np = 0;
        g.R.ep = 0;
    }

    function reset() {
        G.istore = instruction_array_from_pcode();
        initialize_registers(G);
        render_istore(G);
        render_registers(G.R);
        render_labels(G);
    }

    return { 'init': init, 'reset': reset };
}());

