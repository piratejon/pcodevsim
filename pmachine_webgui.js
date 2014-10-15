/*jslint browser:true */

var pmachine_webgui = (function () {
    "use strict";

    var pm;

    function new_program() {
        if (pm !== undefined) {
            document.getElementById('pcode').value = document.getElementById('installed_programs').value;
        }
    }

    function reset() {
        pm.reset(document.getElementById('pcode').value.split('\n'));
        // now put the lime in the coconut
        // i mean put the pmachine instructions in the instruction array table
    }

    function pmachine_loaded() {
        pm = pmachine.pmachine;
        if (this !== undefined && this.readyState === 4 && this.status === 200) {
            // console.log("WINRAR! readyState: " + this.readyState + ", status: " + this.status);
        } else {
            if (this !== undefined) {
                // console.log("readyState: " + this.readyState + ", status: " + this.status);
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
        load_script("file:///home/js/src/pcodevsim/pmachine.js");
    }

    function step() {
        var insn;

        // preserve_old_state(G);

        insn = pm.G.istore[pm.G.R.pc];

        console.log("Executing " + JSON.stringify(insn));
        pm.G.opcode_dispatch[insn.opcode](pm.G, insn);

        // render_dynamic_visual_elements(G);
    }

    function bodyload() {
        document.getElementById('installed_programs').children[0].selected = 'selected';
        load_pmachine();
    }

    function status() {
        if (pm !== undefined) {
            return pm.state();
        }
    }

    return { 'bodyload': bodyload, 'step': step, 'new_program': new_program, 'status': status, 'reset': reset };
}());

