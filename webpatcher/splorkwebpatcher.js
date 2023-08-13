const resultdisplay = document.querySelector('#resultdisplay');
const imgpicker = document.querySelector('#imgpicker');
const imgcanvas = document.querySelector('#imgcanvas');
const patchbutton = document.querySelector('#image_picker');

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 120;

const INSTR_NOOP = 0;
const INSTR_A = 1;
const INSTR_B = 2;
const INSTR_RIGHT = 4;
const INSTR_LEFT = 8;
const INSTR_UP = 16;
const INSTR_DOWN = 32;
const INSTR_L1_L3 = 64;
const INSTR_WAIT = 128;

const overdraw_amount = 10;

const imgctx = imgcanvas.getContext("2d");

function get_color_button_press(rgba) {
    let instruction = INSTR_NOOP;
    let r = rgba[0];
    let g = rgba[1];
    let b = rgba[2];
    let a = rgba[3];

    // if pixel is black, use it
    if ((r + g + b) == 0) {
        instruction = INSTR_A;
    }

    // avoid pixels with transparency
    if (a != 255) {
        instruction = INSTR_NOOP;
    }
    return instruction;
}

function get_x_y(line, line_progress, vertical_mode) {
    let x = vertical_mode ? line : line_progress;
    let y = vertical_mode ? line_progress : line;
    return [x, y];
}

function get_moving_direction_key(vertical_mode) {
    return vertical_mode ? INSTR_RIGHT : INSTR_DOWN;
}


function get_drawing_direction_key(reversed_line, vertical_mode) {
    if (vertical_mode) {
        return reversed_line ? INSTR_UP : INSTR_DOWN;
    }
    else {
        return reversed_line ? INSTR_LEFT : INSTR_RIGHT;
    }
}

function get_line_size(vertical_mode) {
    return vertical_mode ? CANVAS_WIDTH : CANVAS_HEIGHT;
}


function get_line_progress_size(vertical_mode) {
    return vertical_mode ? CANVAS_HEIGHT : CANVAS_WIDTH;
}

function get_correct_pixel(line, line_progress, reversed_line, vertical_mode) {
    let corrected_line_progress = (reversed_line ? (get_line_progress_size(vertical_mode) - 1) - line_progress : line_progress);
    let xy = get_x_y(line, corrected_line_progress, vertical_mode);
    return imgctx.getImageData(xy[0], xy[1], 1, 1).data;
}

function is_line_empty(line, vertical_mode) {
    for (let line_progress = 0; line_progress < get_line_progress_size(vertical_mode); line_progress++) {
        xy = get_x_y(line, line_progress, vertical_mode);
        rgba = imgctx.getImageData(xy[0], xy[1], 1, 1).data;
        if (get_color_button_press(rgba) == INSTR_A) {
            return false;
        }
    }
    return true;
}

function gen_instructions(vertical_mode) {
    // assert intended.size == (320, 120), "image size is incorrect, should be 320x120"

    let instructions = [];
    let reversed_line = false;

    // Up here is just to help switch recognize that we're here.
    instructions = instructions.concat([INSTR_UP, INSTR_WAIT, INSTR_A, INSTR_WAIT, INSTR_A, INSTR_WAIT]);

    // Move to top left
    for (let i = 0; i < CANVAS_WIDTH; i++) {
        instructions = instructions.concat([INSTR_UP + INSTR_LEFT, INSTR_NOOP]);
    }

    // reset canvas and set size
    instructions.push(INSTR_L1_L3);

    // Give it some time to settle
    for (let i = 0; i < 50; i++) {
        instructions = instructions.concat([INSTR_NOOP]);
    }

    // Draw image
    for (let line = 0; line < get_line_size(vertical_mode); line++) {
        // Give it some time to settle
        for (let i = 0; i < 10; i++) {
            instructions = instructions.concat([INSTR_NOOP]);
        }

        // skip empty lines
        if (is_line_empty(line, vertical_mode)) {
            instructions = instructions.concat([get_moving_direction_key(vertical_mode), INSTR_NOOP]);
            continue;
        }

        // prepare draw and move presses
        for (let line_progress = 0; line_progress < get_line_progress_size(vertical_mode); line_progress++) {
            let rgba = get_correct_pixel(
                line, line_progress, reversed_line, vertical_mode
            );
            let draw_instruction = get_color_button_press(rgba);
            let move_instruction = get_drawing_direction_key(reversed_line, vertical_mode);

            instructions = instructions.concat([draw_instruction, move_instruction]);
        }

        // overdraw
        for (let i = 0; i < overdraw_amount; i++) {
            instructions = instructions.concat([get_drawing_direction_key(reversed_line, vertical_mode), INSTR_NOOP]);
        }

        // Move to the next line
        instructions = instructions.concat(get_moving_direction_key(vertical_mode), INSTR_NOOP);
        reversed_line = !reversed_line;
    }

    return instructions;
}

function instructions_to_c(instructions) {
    file_text = (
        "const uint8_t drawing_instructions["
        + instructions.length.toString()
        + "] = {\n"
        + instructions.join(", ")
        + "\n};"
    )

    return file_text;
}

function handler_image_picker() {
    resultdisplay.innerText = "converting image to draw instructions...";
    console.log(":3");

    let h_instructions = gen_instructions(false);
    let v_instructions = gen_instructions(true);
    let instructions = h_instructions.length < v_instructions.length ? h_instructions : v_instructions;

    // assumes 25ms per cycle + 1.5 seconds for initial wait commands
    exec_mins = Math.floor((1500 + (instructions.length * 25)) / 1000 / 60);

    resultdisplay.innerText = (
        "Done, downloading uf2 image. Hold boot button on Pi Pico while plugging it into your computer and copy the uf2 file into it. (Expected drawing time = ~" + exec_mins + "mins.)"
    )

    console.log(instructions_to_c(instructions));
}

function handle_image(file){
    // from https://stackoverflow.com/a/10906961/3286892, partially modified
    var reader = new FileReader();
    reader.onload = function(event){
        img = new Image();
        img.onload = function() {
            imgcanvas.width = 320;
            imgcanvas.height = 120;

            if (img.width != 320 || img.height != 120) {
                resultdisplay.innerText = "image is not 320x120, cannot proceed...";
                patchbutton.disabled = true;
            }

            resultdisplay.innerText = "ready to patch";
            patchbutton.disabled = false;

            // imgctx.scale(imgcanvas.width / img.width, imgcanvas.height / img.height);
            imgctx.drawImage(img, 0, 0);
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);     
}

imgpicker.addEventListener('change', (event) => {
    imgctx.clearRect(0, 0, imgcanvas.width, imgcanvas.height);
    handle_image(imgpicker.files[0]);
});
