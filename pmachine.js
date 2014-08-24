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
        return parseInt(level, 10);
    }

    function insn_mst(g, insn) {
        datastore_push("rv", "int", 0);
        datastore_push("sl", "int", base(insn.op1));
        datastore_push("dl", "int", 0);
        datastore_push("ep", "int", g.R.ep);

        g.R.pc += 1;
    }

    function insn_cup(g, insn) {
        datastore_push("ra", "int", g.R.pc + 1);

        if (g.line_labels.hasOwnProperty(insn.op2)) {
            g.R.pc = g.line_labels[insn.op2];
        } else {
            g.R.pc = insn.op2;
        }
    }

    function insn_stp(g, insn) {
        g.form.step.disabled = true;
    }

    /*
    function insn_ent(g, insn) {
    }

    function insn_lvi(g, insn) {
    }

    function insn_csp(g, insn) {
    }

    function insn_ldc(g, insn) {
    }

    function insn_rtn(g, insn) {
    }

    function insn_lda(g, insn) {
    }

    function insn_mod(g, insn) {
    }

    function insn_sti(g, insn) {
    }

    function insn_equ(g, insn) {
    }

    function insn_fjp(g, insn) {
    }

    function insn_ujp(g, insn) {
    }
    */

    function init() {
        G = {};
        G.R = {};
        G.old_R = {};
        G.istore = {};
        G.dstore = [];
        G.old_dstore = [];
        G.line_labels = {};
        G.line_labels_rev = {};
        G.data_labels = {};
        G.data_labels_rev = {};
        G.implicit_label_matcher = /^(L\d+)/;
        G.explicit_label_matcher = /^#define[ \t]+(L\d+)[ \t]+(\d+)/;
        G.instruction_matcher = /^([A-Za-z0-9]{0,10})?[ \t]*([A-Za-z0-9]{0,10})?[ \t]*([A-Za-z0-9]{0,10})?[ \t]*([A-Za-z0-9]*)?[ \t]*$/;
        // G.log = console.log;
        G.log = function () { };
        G.form = {
            labels: document.getElementById('label_body'),
            istore: document.getElementById('istore_body'),
            dstore: document.getElementById('dstore_body'),
            pcode: document.getElementById('pcode'),
            step: document.getElementById('step')
        };

        G.opcode_dispatch = {
            "mst": insn_mst,
            "cup": insn_cup/*,
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

    function clear_children(p) {
        while (p.hasChildNodes()) {
            p.removeChild(p.lastChild);
        }
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

    function instruction_array_from_pcode(pcode) {
        var line, istore, actual_line_number, insn;

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

    function render_static_istore_elements(g) {
        var insn, insn_table_row;

        insn_table_row = function (insn) {
            var tr, insn_table_cell;

            tr = document.createElement('tr');

            insn_table_cell = function (v) {
                var td = document.createElement('td');
                td.innerHTML = v === undefined ? '' : v;
                return td;
            };

            tr.appendChild(insn_table_cell(insn.address));
            tr.appendChild(insn_table_cell(insn.opcode));
            tr.appendChild(insn_table_cell(insn.op1));
            tr.appendChild(insn_table_cell(insn.op2));

            return tr;
        };

        for (insn in g.istore) {
            if (g.istore.hasOwnProperty(insn)) {
                g.form.istore.appendChild(insn_table_row(g.istore[insn], g));
            }
        }
    }

    function render_dynamic_istore_elements(g) {
        if (g.old_R !== undefined && g.old_R.pc !== undefined) {
            g.form.istore.childNodes[g.old_R.pc].removeAttribute('id');
        }
        g.form.istore.childNodes[g.R.pc].id = 'pc_row';
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
        var wrap, label;

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

        for (label in g.line_labels) {
            if (g.line_labels.hasOwnProperty(label)) {
                g.form.labels.appendChild(wrap(label, g.line_labels[label]));
            }
        }

        for (label in g.data_labels) {
            if (g.data_labels.hasOwnProperty(label)) {
                g.form.labels.appendChild(wrap(label, g.data_labels[label]));
            }
        }
    }

    function render_dynamic_dstore_elements(g) {
        var cell, wrap;

        clear_children(g.form.dstore);

        wrap = function (address, c, is_old) {
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

            if (!is_old) {
                tr.classList.add('just_changed');
            }

            return tr;
        };

        for (cell = g.dstore.length - 1; cell >= 0; cell -= 1) {
            g.form.dstore.appendChild(wrap(cell, g.dstore[cell], g.old_dstore.hasOwnProperty(cell)));
        }
    }

    function initialize_registers(g) {
        g.old_R = {};
        g.R.pc = infer_initial_program_counter(g.istore);
        g.R.sp = 0;
        g.R.mp = 0;
        g.R.np = 0;
        g.R.ep = 0;
    }

    function reset_visual_elements(g) {
        clear_children(g.form.istore);
        clear_children(g.form.dstore);
        clear_children(g.form.labels);
    }

    function render_static_visual_elements(g) {
        render_labels(g);
        render_static_istore_elements(g);
        // render_static_dstore_elements(g);
    }

    function render_dynamic_visual_elements(g) {
        render_registers(g);
        render_dynamic_istore_elements(g);
        render_dynamic_dstore_elements(g);
    }

    function reset() {
        init();

        G.istore = instruction_array_from_pcode(G.form.pcode.value.split('\n'));
        initialize_registers(G);

        reset_visual_elements(G);
        render_static_visual_elements(G);
        render_dynamic_visual_elements(G);

        G.form.step.disabled = false;
    }

    function copy_dstore_cell(cell) {
        var c, r = {};
        for (c in cell) {
            if (cell.hasOwnProperty(c)) {
                r[c] = cell[c];
            }
        }

        return r;
    }

    function preserve_old_state(g) {
        var reg, i;
        for (reg in g.R) {
            if (g.R.hasOwnProperty(reg)) {
                g.old_R[reg] = g.R[reg];
            }
        }

        g.old_dstore = [];
        for (i = 0; i < g.dstore.length; i += 1) {
            g.old_dstore[i] = copy_dstore_cell(g.dstore[i]);
        }
    }

    function step() {
        var insn;

        preserve_old_state(G);

        insn = G.istore[G.R.pc];

        console.log('"' + insn.opcode + '"');
        G.opcode_dispatch[insn.opcode](G, insn);

        render_dynamic_visual_elements(G);
    }

    return { 'init': init, 'reset': reset, 'step': step };
}());

