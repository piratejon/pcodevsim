/*jslint browser:true */

var pmachine_webgui = (function () {
    "use strict";

    var pm, gui, old_state;

    function initialize_old_state() {
        return {
            'dstore': [],
            'R': {
                'pc': -1,
            },
        };
    }

    function clear_children(p) {
        while (p && p.hasChildNodes()) {
            p.removeChild(p.lastChild);
        }
    }

    function reset_visual_elements(gui) {
        clear_children(gui.istore);
        clear_children(gui.dstore);
        clear_children(gui.labels);
        // clear_children(gui.arrows.dynamic_link);
        // clear_children(gui.arrows.static_link);
        clear_children(gui.constants);
        gui.stdout.value = '';
    }

    function render_static_istore_elements(gui, machine_state) {
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

        for (insn in machine_state.istore) {
            if (machine_state.istore.hasOwnProperty(insn)) {
                gui.istore.appendChild(insn_table_row(machine_state.istore[insn]));
            }
        }
    }

    function render_dynamic_istore_elements(gui, machine_state) {
        if (machine_state.R.pc !== -1) {
            if (old_state !== undefined && old_state.R.pc !== -1) {
                gui.istore.childNodes[old_state.R.pc].removeAttribute('id');
            }
            gui.istore.childNodes[machine_state.R.pc].id = 'pc_row';
        }
    }

    function render_labels(gui, machine_state) {
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

        for (label in machine_state.line_labels) {
            if (machine_state.line_labels.hasOwnProperty(label)) {
                gui.labels.appendChild(wrap(label, machine_state.line_labels[label]));
            }
        }

        for (label in machine_state.data_labels) {
            if (machine_state.data_labels.hasOwnProperty(label)) {
                gui.labels.appendChild(wrap(label, machine_state.data_labels[label]));
            }
        }
    }

    function render_constants(gui, machine_state) {
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

        for (i = 0; i < machine_state.constants.length; i += 1) {
            gui.constants.appendChild(wrap(i, machine_state.constants[i]));
        }
    }

    function render_static_visual_elements(gui, machine_state) {
        render_labels(gui, machine_state);
        render_static_istore_elements(gui, machine_state);
        render_constants(gui, machine_state);
    }

    function getPosition(element) {
        // <http://www.kirupa.com/html5/get_element_position_using_javascript.htm>
        // with modifications for width, height, and marginBottom
        var l = 0, t = 0, w = 0, h = 0, mb = 0;

        if (element) {
            w = element.offsetWidth;
            h = element.offsetHeight;
            mb = window.getComputedStyle(element).marginBottom;
        }

        while (element) {
            l += (element.offsetLeft - element.scrollLeft + element.clientLeft);
            t += (element.offsetTop - element.scrollTop + element.clientTop);
            element = element.offsetParent;
        }

        return { left: l, top: t, width: w, height: h, marginBottom: mb };
    }

    function render_dynamic_dstore_elements(gui, machine_state, old_state) {
        var cell, wrap;

        clear_children(gui.dstore);
        clear_children(gui.arrows.dynamic_link);
        clear_children(gui.arrows.static_link);

        wrap = function (machine_state, address, os) {
            var tr, wrap2, c, o;

            c = machine_state.dstore[address];
            o = os.dstore[address] || {};

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

            if (address === machine_state.R.sp) {
                tr.id = 'sp_row';
            }

            if (address === machine_state.R.ep) {
                tr.id = 'ep_row';
            }

            if (address === machine_state.R.mp) {
                tr.id = 'mp_row';
            }

            return tr;
        };

        for (cell = machine_state.dstore.length - 1; cell >= 0; cell -= 1) {
            gui.dstore.appendChild(wrap(machine_state, cell, old_state));
        }
    }

    function draw_dstore_arrow(gui, start_cell, end_cell, width, side) {
        var child_count, bottom_reference, start_pos, end_pos, box, arrow_end;

        child_count = gui.dstore.childNodes.length;
        bottom_reference = getPosition(gui.dstore.childNodes[child_count - 1]).top;

        start_pos = getPosition(gui.dstore.childNodes[child_count - start_cell - 1]);
        end_pos = getPosition(gui.dstore.childNodes[child_count - end_cell - 1]);

        box = document.createElement('div');
        box.style.right = '0px';
        box.style.width = width + 'px';
        box.style.height = (end_pos.top - start_pos.top) + 'px';
        box.style.top = (start_pos.top - (start_pos.height / 2) - bottom_reference) + 'px';

        arrow_end = document.createElement('div');
        box.appendChild(arrow_end);
        gui.arrows.dynamic_link.appendChild(box);
    }

    function render_dynamic_link_arrows(gui, machine_state) {
        var link_counter, cell, first_cell_index, last_cell_index;

        for (cell = 0, link_counter = false; cell < machine_state.dstore.length; cell += 1) {
            if (machine_state.dstore[cell].id === "dl") {
                if (cell !== 2) {
                    first_cell_index = cell;
                    last_cell_index = machine_state.dstore[cell].value;

                    if (link_counter) {
                        draw_dstore_arrow(gui, first_cell_index, last_cell_index, 50, 'left');
                    } else {
                        draw_dstore_arrow(gui, first_cell_index, last_cell_index, 25, 'left');
                    }

                    link_counter = !link_counter;
                }
            }
        }

        /*
        // collect static link targets
        sl_target = {};
        for (cell = 0; cell < machine_state.dstore.length; cell += 1) {
            if (machine_state.dstore[cell].id == "sl") {
                if (cell !== 2) {
                    if (!sl_target.hasOwnProperty(machine_state.dstore[cell].value)) {
                        sl_target[machine_state.dstore[cell].value] = [];
                    }
                    sl_target[machine_state.dstore[cell].value].push(cell);
                }
            }
        }

        for(target in sl_target) {
            if (sl_target.hasOwnProperty(target)) {
                for (src = 0; src < sl_target[target].length; src += 1) {
                      
                }
            }
        }
        */
    }

    function render_registers(gui, machine_state) {
        var reg, elt;
        for (reg in machine_state.R) {
            if (machine_state.R.hasOwnProperty(reg)) {
                elt = gui.registers[reg];
                elt.innerHTML = machine_state.R[reg];
                if (machine_state.R[reg] === old_state.R[reg]) {
                    // http://stackoverflow.com/questions/195951/change-an-elements-css-class-with-javascript
                    elt.classList.remove('just_changed');
                } else {
                    elt.classList.add('just_changed');
                }
            }
        }
    }

    function append_stdout(gui, stdout) {
        // console.log("Appending stdout; length: " + stdout.length);
        while (stdout.length > 0) {
            gui.stdout.value += stdout[0];
            stdout.shift();
        }
    }

    function update_vm_state(gui, vm_status) {
        gui.vm_state.innerHTML = vm_status;
        gui.step.disabled = (vm_status !== "running");
    }

    function render_dynamic_visual_elements(gui, machine_state, old_state) {
        render_registers(gui, machine_state);
        render_dynamic_istore_elements(gui, machine_state);
        render_dynamic_dstore_elements(gui, machine_state, old_state);
        render_dynamic_link_arrows(gui, machine_state);
        // render_static_link_arrows(gui, machine_state);
        append_stdout(gui, pm.get_stdout_buffer());
        update_vm_state(gui, pm.get_vm_status());
    }

    function gui_append_stdin_history(gui, value) {
        var td = document.createElement('td');
        td.innerHTML = value;
        gui.stdin_history.appendChild(td);
    }

    function stdin_callback() {
        var current_stdin = gui.stdin.value;
        gui_append_stdin_history(gui, current_stdin);
        gui.stdin.value = "";
        return current_stdin;
    }

    function reset() {
        pm.init();

        pm.reset(gui.program_text.value.split('\n'));

        pm.set_stdin_callback(stdin_callback);

        old_state = initialize_old_state();
        reset_visual_elements(gui);
        render_static_visual_elements(gui, pm.get_machine_state());
        render_dynamic_visual_elements(gui, pm.get_machine_state(), old_state);
    }

    function initialize_gui_bits() {
        var new_gui;
        new_gui = {
            stdin_history: document.getElementById('stdin_history'),
            program_text: document.getElementById('pcode'),
            constants: document.getElementById('constants_body'),
            vm_state: document.getElementById('vm_state'),
            stdout: document.getElementById('stdout'),
            labels: document.getElementById('label_body'),
            istore: document.getElementById('istore_body'),
            dstore: document.getElementById('dstore_body'),
            arrows: {
                dynamic_link: document.getElementById('dynamic_arrows'),
                static_link: document.getElementById('static_arrows')
            },
            stdin: document.getElementById('stdin_buffer'),
            pcode: document.getElementById('pcode'),
            step: document.getElementById('step'),

            registers: {
                'pc': document.getElementById('val_pc'),
                'sp': document.getElementById('val_sp'),
                'mp': document.getElementById('val_mp'),
                'np': document.getElementById('val_np'),
                'ep': document.getElementById('val_ep'),
            },
        };

        new_gui.step.disabled = true;
        return new_gui;
    }

    function new_program(g) {
        if (g === undefined) {
            g = gui = initialize_gui_bits();
        }
        g.program_text.value = document.getElementById('installed_programs').value;
        update_vm_state(g, pm.get_vm_status());
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
        var reg, i, new_old_state;

        new_old_state = {
            'R': {}
        };

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
                new_old_state.R[reg] = g.R[reg];
            }
        }

        new_old_state.dstore = [];
        for (i = 0; i < g.dstore.length; i += 1) {
            new_old_state.dstore[i] = copy_dstore_cell(g.dstore[i]);
        }

        return new_old_state;
    }

    function step() {
        var insn, machine_state;

        if (pm.get_vm_status() === "running") {
            machine_state = pm.get_machine_state();

            old_state = preserve_old_state(machine_state);

            insn = machine_state.istore[machine_state.R.pc];

            // console.log("Executing " + JSON.stringify(insn));
            machine_state.opcode_dispatch[insn.opcode](machine_state, insn);

            render_dynamic_visual_elements(gui, machine_state, old_state);
        }
    }

    function bodyload() {
        document.getElementById('installed_programs').children[0].selected = 'selected';
        gui = initialize_gui_bits();
        old_state = initialize_old_state();
        load_pmachine();
    }

    return {
        'new_program': new_program,
        'bodyload': bodyload,
        'reset': reset,
        'step': step,
    };
}());

