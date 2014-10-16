/*jslint browser:true */

var pmachine_webgui = (function () {
    "use strict";

    var pm, gui;

    function clear_children(p) {
        while (p.hasChildNodes()) {
            p.removeChild(p.lastChild);
        }
    }

    function reset_visual_elements(gui) {
        clear_children(gui.istore);
        clear_children(gui.dstore);
        clear_children(gui.labels);
        clear_children(gui.constants);
        gui.stdout.value = '';
    }

    function render_static_visual_elements(gui, global_state) {
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

        for (insn in global_state.istore) {
            if (global_state.istore.hasOwnProperty(insn)) {
                gui.istore.appendChild(insn_table_row(global_state.istore[insn]));
            }
        }
    }

    function render_dynamic_visual_elements(g, G) {
    }

    function reset() {
        pm.init();
        pm.reset(gui.program_text.value.split('\n'));
        reset_visual_elements(gui);
        render_static_visual_elements(gui, pm.get_machine_state());
        render_dynamic_visual_elements(gui, pm.get_machine_state());
    }

    function pmachine_loaded() {
        pm = pmachine.pmachine;
        if (this !== undefined && this.readyState === 4 && this.status === 200) {
            // console.log("WINRAR! readyState: " + this.readyState + ", status: " + this.status);
        } else {
            if (this !== undefined) {
                // console.log("readyState: " + this.readyState + ", status: " + this.status);
                new_program(gui);
            } else {
                // console.log("this undefined");
            }
        }
    }

    function load_script(url) {
        var head, script;

        head = document.getElementsByTagName("head")[0];
        script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;
        script.onreadystatechange = pmachine_loaded;
        script.onload = pmachine_loaded;

        head.appendChild(script);
    }

    function load_pmachine() {
        // load_script("file:///home/js/src/pcodevsim/pmachine.js");
        load_script("pmachine.js");
    }

    function preserve_old_state(g) {
        var reg, i;

        function copy_dstore_cell(cell) {
            var c, r = {};
            for (c in cell) {
                if (cell.hasOwnProperty(c)) {
                    r[c] = cell[c];
                }
            }

            return r;
        }

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

        preserve_old_state(pm.G);

        insn = pm.G.istore[pm.G.R.pc];

        console.log("Executing " + JSON.stringify(insn));
        pm.G.opcode_dispatch[insn.opcode](pm.G, insn);

        render_dynamic_visual_elements(pm.G);
    }

    function initialize_gui_bits() {
        var new_gui;
        new_gui = {
            program_text: document.getElementById('pcode'),
            constants: document.getElementById('constants_body'),
            stdout: document.getElementById('stdout'),
            labels: document.getElementById('label_body'),
            istore: document.getElementById('istore_body'),
            dstore: document.getElementById('dstore_body'),
            pcode: document.getElementById('pcode'),
            step: document.getElementById('step')
        };
        return new_gui;
    }

    function new_program(g) {
        if (g === undefined) {
            g = gui = initialize_gui_bits();
        }
        g.program_text.value = document.getElementById('installed_programs').value;
    }

    function bodyload() {
        document.getElementById('installed_programs').children[0].selected = 'selected';
        gui = initialize_gui_bits();
        load_pmachine();
    }

    function status() {
        if (pm !== undefined) {
            return pm.state();
        }
    }

    return {
        'new_program': new_program,
        'bodyload': bodyload,
        'status': status,
        'reset': reset,
        'step': step,
    };
}());

