/*jslint browser:true */

var pmachine = (function () {
    "use strict";

    var G;

    function datastore_push(id, type, value) {
        G.dstore.push({id: id, type: type, value: value});
        // G.R.sp = G.dstore.length - 1;
        G.R.sp += 1;
    }

    function datastore_pop() {
        var popee = G.dstore[G.dstore.length - 1];
        G.dstore.pop();
        G.R.sp -= 1;
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

    function get_frame_element(mp, v) {
        return G.dstore[get_frame_pointer(mp, v)];
    }

    function set_frame_element(mp, elt, value) {
        G.dstore[get_frame_pointer(mp, elt)].value = value;
    }

    // try to resolve l into a label or assume it's an address
    function int_from_label(l) {
        if (G.line_labels.hasOwnProperty(l)) {
            return parseInt(G.line_labels[l], 10);
        }

        if (G.data_labels.hasOwnProperty(l)) {
            return parseInt(G.data_labels[l], 10);
        }

        return parseInt(l, 10);
    }

    function follow_link(level, mp, frame_element) {
        if (level === 0) {
            return mp;
        }

        return follow_link(level - 1, G.dstore[get_frame_pointer(mp, frame_element)].value, frame_element);
    }

    function write_to_stdout(item) {
        G.form.stdout.value += item.toString();
    }

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
        G.constants = [];
        G.implicit_label_matcher = /^(L\d+)/;
        G.explicit_label_matcher = /^#define[ \t]+(L\d+)[ \t]+(\d+)/;
        G.instruction_matcher = /^([A-Za-z0-9]{0,10})?[ \t]*([A-Za-z0-9]{0,10})?[ \t]*([A-Za-z0-9]{0,10})?[ \t]*(.*)/;
        // G.log = console.log;
        G.log = function () { };
        G.form = {
            constants: document.getElementById('constants_body'),
            stdout: document.getElementById('stdout'),
            labels: document.getElementById('label_body'),
            istore: document.getElementById('istore_body'),
            dstore: document.getElementById('dstore_body'),
            pcode: document.getElementById('pcode'),
            step: document.getElementById('step')
        };

        G.opcode_dispatch = {
            "mst": function (g, insn) {
                datastore_push("rv", "i", 0);
                datastore_push("sl", "i", follow_link(parseInt(insn.op1, 10), g.R.mp, "dl"));
                datastore_push("dl", "i", g.R.mp); // the dynamic link points to the callee's stack frame
                datastore_push("ep", "i", g.R.ep);
                datastore_push("ra", "a", "");

                // these pushes had the effect of incrementing 5 times

                g.R.pc += 1;
            },

            "cup": function (g, insn) {
                console.log("cup old mp: " + g.R.mp);
                g.R.mp = g.R.sp - (parseInt(insn.op1, 10) + 4);
                console.log("cup new mp: " + g.R.mp);
                set_frame_element(g.R.mp, "ra", g.R.pc + 1);

                g.R.pc = int_from_label(insn.op2);
            },

            "stp": function (g, insn) {
                g.form.step.disabled = true;
                // this signals 
                g.R.pc = -1;
            },

            "ent": function (g, insn) {
                if (insn.op1 === "sp") {
                    var new_space;

                    new_space = g.R.mp + int_from_label(insn.op2);

                    while (g.R.sp < new_space) {
                        datastore_push("ent", "", 0);
                    }
                    // probably should like actually allocate this space lol?
                    // g.R.sp = g.R.mp + int_from_label(insn.op2);
                } else if (insn.op1 === "ep") {
                    g.R.ep = g.R.sp + int_from_label(insn.op2);
                }

                g.R.pc += 1;
            },

            "rtn": function (g, insn) {
                var old_mp = g.R.mp;

                g.R.pc = get_frame_element(g.R.mp, "ra").value;
                console.log("New pc: " + g.R.pc);
                g.R.ep = get_frame_element(g.R.mp, "ep").value;
                console.log("New ep: " + g.R.ep);
                g.R.mp = get_frame_element(g.R.mp, "dl").value;
                console.log("New mp: " + g.R.mp);

                console.log("Old sp: " + g.R.sp);
                while (g.R.sp > old_mp) {
                    datastore_pop();
                }
                console.log("New sp: " + g.R.sp);
            },

            "lda": function (g, insn) {
                // possibly overwrites parts of the stack frame!
                datastore_push("", "a", follow_link(parseInt(insn.op1, 10), g.R.mp, "dl") + parseInt(insn.op2, 10));

                g.R.pc += 1;
            },

            "ldc": function (g, insn) {
                if (insn.op1 === "c" || insn.op1 === "b") {
                    datastore_push("", insn.op1, insn.op2);
                } else {
                    datastore_push("", insn.op1, g.constants[insn.op2].value);
                }

                g.R.pc += 1;
            },

            "csp": function (g, insn) {
                switch (insn.op1) {
                case "wrs":
                case "wri":
                    // no typechecking is done LOL
                    // TODO strip off the enclosing quotes
                    write_to_stdout(datastore_pop().value);
                    break;
                default:
                    break;
                }

                g.R.pc += 1;
            },

            "sti": function (g, insn) {
                var value, address;

                value = datastore_pop();
                address = datastore_pop();

                g.dstore[address.value] = value;

                g.R.pc += 1;
            },

            "lvi": function (g, insn) {
                var offset;

                offset = follow_link(parseInt(insn.op1, 10), g.R.mp, "sl") + parseInt(insn.op2, 10);

                datastore_push("", "i", g.dstore[offset].value);

                g.R.pc += 1;
            },

            "equ": function (g, insn) {
                var a, b;

                a = datastore_pop();
                b = datastore_pop();

                datastore_push("", "b", a.type === b.type && a.value === b.value);

                g.R.pc += 1;
            },

            "fjp": function (g, insn) {
                if (datastore_pop().value === false) {
                    g.R.pc = int_from_label(insn.op1);
                } else {
                    g.R.pc += 1;
                }
            },

            "mod": function (g, insn) {
                var a, b;

                a = parseInt(datastore_pop().value, 10);
                b = parseInt(datastore_pop().value, 10);

                datastore_push("", "i", (b % a).toString());

                g.R.pc += 1;
            },

            "ujp": function (g, insn) {
                g.R.pc = int_from_label(insn.op1);
            },

            "lvr": function (g, insn) {
                var offset;

                offset = follow_link(parseInt(insn.op1, 10), g.R.mp, "sl") + parseInt(insn.op2, 10);

                datastore_push("", "r", g.dstore[offset].value);

                g.R.pc += 1;
            },

            "les": function (g, insn) {
                var a, b;

                a = datastore_pop();
                b = datastore_pop();

                datastore_push("", "b", b.value < a.value);

                g.R.pc += 1;
            },

            "neq": function (g, insn) {
                var a, b;

                a = datastore_pop();
                b = datastore_pop();

                datastore_push("", "b", b.value !== a.value);

                g.R.pc += 1;
            },

            "grt": function (g, insn) {
                var a, b;

                a = datastore_pop();
                b = datastore_pop();

                datastore_push("", "b", b.value > a.value);

                g.R.pc += 1;
            },

            "leq": function (g, insn) {
                var a, b;

                a = datastore_pop();
                b = datastore_pop();

                datastore_push("", "b", b.value <= a.value);

                g.R.pc += 1;
            },

            "geq": function (g, insn) {
                var a, b;

                a = datastore_pop();
                b = datastore_pop();

                datastore_push("", "b", b.value >= a.value);

                g.R.pc += 1;
            },

            "mpi": function (g, insn) {
                var a, b;

                a = datastore_pop();
                b = datastore_pop();

                datastore_push("", "i", b.value * a.value);

                g.R.pc += 1;
            },

            "inc": function (g, insn) {
                var val;

                val = datastore_pop();

                datastore_push("", val.type, val.value + 1);
 
                g.R.pc += 1;
            },

            "dvr": function (g, insn) {
                var a, b;

                a = datastore.pop();
                b = datastore.pop();

                datastore_push("", "r", b/a);
            }
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

    function insert_constant(insn) {
        var l = G.constants.length;
        G.constants.push({type: insn.op1, value: insn.op2});
        return l.toString();
    }

    function scan_instruction(i, line) {
        var insn, scan;

        scan = G.instruction_matcher.exec(line);

        insn = {
            address: i,
            label: scan[1],
            opcode: scan[2],
            op1: scan[3],
            op2: scan[4].trim()
        };

        // check for and insert any constants found
        if (insn.opcode === "ldc" && insn.op1 !== "c" && insn.op1 !== "b") {
            insn.op2 = insert_constant(insn);
        }

        return insn;
    }

    function instruction_array_from_pcode(pcode) {
        var line, istore, actual_line_number, insn;

        istore = [];

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
                        istore.push(insn);
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
        if (g.R.pc !== -1) {
            if (g.old_R !== undefined && g.old_R.pc !== undefined) {
                g.form.istore.childNodes[g.old_R.pc].removeAttribute('id');
            }
            g.form.istore.childNodes[g.R.pc].id = 'pc_row';
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

        // if there is no mark stack just start at the top
        return 0;
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

    function render_constants(g) {
        var wrap, i;

        wrap = function (l, v) {
            var tr, td;

            tr = document.createElement('tr');

            td = document.createElement('td');
            td.innerHTML = l;
            tr.appendChild(td);

            td = document.createElement('td');
            td.innerHTML = v.type;
            tr.appendChild(td);

            td = document.createElement('td');
            td.innerHTML = v.value;
            tr.appendChild(td);

            return tr;
        };

        for (i = 0; i < g.constants.length; i += 1) {
            g.form.constants.appendChild(wrap(i, g.constants[i]));
        }
    }

    function render_dynamic_dstore_elements(g) {
        var cell, wrap;

        clear_children(g.form.dstore);

        wrap = function (g, address) {
            var tr, wrap2, c, o;

            c = g.dstore[address];
            o = g.old_dstore[address] || {};

            wrap2 = function (d, old) {
                var td = document.createElement('td');
                td.innerHTML = d;
                if (d !== old) {
                    td.classList.add('just_changed');
                }
                return td;
            };

            tr = document.createElement('tr');
            tr.appendChild(wrap2(address, address));
            tr.appendChild(wrap2(c.id, o.id));
            tr.appendChild(wrap2(c.type, o.type));
            tr.appendChild(wrap2(c.value, o.value));

            if (address === g.R.sp) {
                tr.id = 'sp_row';
            }

            if (address === g.R.ep) {
                tr.id = 'ep_row';
            }

            if (address === g.R.mp) {
                tr.id = 'mp_row';
            }

            return tr;
        };

        for (cell = g.dstore.length - 1; cell >= 0; cell -= 1) {
            g.form.dstore.appendChild(wrap(g, cell));
        }
    }

    function initialize_registers(g) {
        g.old_R = {};
        g.R.pc = infer_initial_program_counter(g.istore);
        g.R.sp = -1;
        g.R.mp = 0;
        g.R.np = 32767;
        g.R.ep = 5;
        // g.dstore = [];
    }

    function reset_visual_elements(g) {
        clear_children(g.form.istore);
        clear_children(g.form.dstore);
        clear_children(g.form.labels);
        clear_children(g.form.constants);
        g.form.stdout.value = '';
    }

    function render_static_visual_elements(g) {
        render_labels(g);
        render_static_istore_elements(g);
        render_constants(g);
        // render_static_dstore_elements(g);
    }

    function render_dynamic_visual_elements(g) {
        render_registers(g);
        render_dynamic_istore_elements(g);
        render_dynamic_dstore_elements(g);
    }

    function reset() {
        G.dstore = [];
        G.constants = [];

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

        console.log("Executing " + JSON.stringify(insn));
        G.opcode_dispatch[insn.opcode](G, insn);

        render_dynamic_visual_elements(G);
    }

    function new_program() {
        G.form.pcode.value = document.getElementById('installed_programs').value;
    }

    function bodyload() {
        document.getElementById('installed_programs').children[0].selected = 'selected';
        init();
        new_program();
    }

    return { 'bodyload': bodyload, 'init': init, 'reset': reset, 'step': step, 'new_program': new_program };
}());

