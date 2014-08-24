/*jslint browser:true */

var pmachine = (function () {
    "use strict";

    var G;

    function datastore_push(id, type, value) {
        G.dstore.push({id: id, type: type, value: value});
    }

    function datastore_pop() {
        var popee = G.dstore[G.dstore.length - 1];
        G.dstore.pop();
        return popee;
    }

    function base(level) {
        return level + 1;
    }

    function insn_mst(insn) {
        datastore_push("rv", "int", 0);
        datastore_push("sl", "int", base(insn.op1));
        datastore_push("dl", "int", 0);
        datastore_push("ep", "int", G.R.ep);

        G.R.pc += 1;
    }

    /*
    function insn_cup(insn) {
    }

    function insn_stp(insn) {
    }

    function insn_ent(insn) {
    }

    function insn_lvi(insn) {
    }

    function insn_csp(insn) {
    }

    function insn_ldc(insn) {
    }

    function insn_rtn(insn) {
    }

    function insn_lda(insn) {
    }

    function insn_mod(insn) {
    }

    function insn_sti(insn) {
    }

    function insn_equ(insn) {
    }

    function insn_fjp(insn) {
    }

    function insn_ujp(insn) {
    }
    */

    function init() {
        G = {};
        G.R = {};
        G.old_R = {};
        G.istore = {};
        G.dstore = [];
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

        G.opcode_dispatch = {
            "mst": insn_mst/*,
            "cup": insn_cup,
            "stp": insn_stp,
            "ent": insn_ent,
            "lvi": insn_lvi,
            "csp": insn_csp,
            "ldc": insn_ldc,
            "rtn": insn_rtn,
            "lda": insn_lda,
            "mod": insn_mod,
            "sti": insn_sti,
            "equ": insn_equ,
            "fjp": insn_fjp,
            "ujp": insn_ujp
            */
        };
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

    function render_registers(g) {
        var reg, elt;
        for (reg in g.R) {
            if (g.R.hasOwnProperty(reg)) {
                elt = document.getElementById('val_' + reg);
                elt.innerHTML = g.R[reg];
                if (g.R[reg] === g.old_R[reg]) {
                    // http://stackoverflow.com/questions/195951/change-an-elements-css-class-with-javascript
                    elt.classList.remove('just_changed');
                } else {
                    elt.classList.add('just_changed');
                }
                g.old_R[reg] = g.R[reg];
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

    function render_dstore(address, g) {
        var tbody, cell, wrap;

        wrap = function (c) {
            var tr, wrap2;

            wrap2 = function (d) {
                var td = document.createElement('td');
                td.innerHTML = d;
                return td;
            };

            tr = document.createElement('tr');
            tr.appendChild(wrap2(address));
            tr.appendChild(wrap2(c.id));
            tr.appendChild(wrap2(c.type));
            tr.appendChild(wrap2(c.value));

            return tr;
        };

        tbody = document.getElementById('#stack_body');

        for (cell in g.dstore) {
            if (g.dstore.hasOwnProperty(cell)) {
                tbody.appendChild(wrap(cell, g.dstore[cell]));
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

    function step() {
        var insn;

        insn = G.istore[G.R.pc];

        G.opcode_dispatch[insn.opcode](insn);

        render_istore(G);
        render_dstore(G);
        render_registers(G.R);
    }

    return { 'init': init, 'reset': reset, 'step': step };
}());

