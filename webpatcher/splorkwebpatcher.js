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

const BASE_SPLORK_IMAGE_URL = "/splork.bin";
const BASE_SPLORK_IMAGE_INDEX_URL = "/splork_offset.json";

let BASE_SPLORK_IMAGE = null;
let BASE_SPLORK_IMAGE_INDEX = null;

const overdraw_amount = 10;

const imgctx = imgcanvas.getContext("2d", { willReadFrequently: true });

const UF2_MAGIC_START0 = 0x0A324655
const UF2_MAGIC_START1 = 0x9E5D5157
const UF2_MAGIC_END = 0x0AB16F30
const UF2_APP_START_ADDR = 0x10000000
const UF2_FAMILY_ID = 0xE48BFF56

async function get_base_splork_image() {
    const response = await fetch(BASE_SPLORK_IMAGE_URL);
    const base_image_buffer = await response.arrayBuffer();
    return base_image_buffer;
}

async function get_base_splork_image_offset() {
    const response = await fetch(BASE_SPLORK_IMAGE_INDEX_URL);
    const offset_json = await response.json();
    return offset_json["offset"];
}

async function get_splork_base_image() {
    BASE_SPLORK_IMAGE = await get_base_splork_image();
    BASE_SPLORK_IMAGE_INDEX = await get_base_splork_image_offset();
    imgpicker.disabled = false;
    resultdisplay.innerText = "pick image to convert (should be 320x120, PNG, black and white)";
    console.log(BASE_SPLORK_IMAGE_INDEX);
}

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

async function gen_instructions(vertical_mode) {
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

// https://gist.github.com/72lions/4528834
var _appendBuffer = function(buffer1, buffer2) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
};

async function convert_to_uf2(file_content) {
    // based on https://github.com/microsoft/uf2/blob/master/utils/uf2conv.py#L120
    const datapadding = new ArrayBuffer(220);
    let magic_end = new ArrayBuffer(4);
    new DataView(magic_end).setUint32(0, UF2_MAGIC_END, true);
    let numblocks = Math.floor((file_content.byteLength + 255) / 256);
    let outp = new ArrayBuffer(0);
    for (let blockno = 0; blockno < numblocks; blockno++) {
        let ptr = 256 * blockno
        let chunk = file_content.slice(ptr, ptr + 256)
        let flags = 0x2000;
        const hd = new ArrayBuffer(8 * 4);
        const hd_dataview = new DataView(hd);
        hd_dataview.setUint32((0 * 4), UF2_MAGIC_START0, true);
        hd_dataview.setUint32((1 * 4), UF2_MAGIC_START1, true);
        hd_dataview.setUint32((2 * 4), flags, true);
        hd_dataview.setUint32((3 * 4), ptr + UF2_APP_START_ADDR, true);
        hd_dataview.setUint32((4 * 4), 256, true);
        hd_dataview.setUint32((5 * 4), blockno, true);
        hd_dataview.setUint32((6 * 4), numblocks, true);
        hd_dataview.setUint32((7 * 4), UF2_FAMILY_ID, true);

        if (chunk.byteLength < 256) {
            chunk = _appendBuffer(chunk, new ArrayBuffer(256 - chunk.byteLength));
        }
        let block = _appendBuffer(hd, chunk);
        block = _appendBuffer(block, datapadding);
        block = _appendBuffer(block, magic_end);
        outp = _appendBuffer(outp, block);
    }
    return outp;
}

// https://stackoverflow.com/a/37340749
function saveByteArray(fileName, byte) {
    var blob = new Blob([byte], {type: "application/octet-stream"});
    var link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
};

async function patch_base_splork_image(base_image, instructions, image_index) {
    let patched_image = base_image.slice(0, image_index);
    patched_image = _appendBuffer(patched_image, Uint8Array.from(instructions));
    patched_image = _appendBuffer(patched_image, new ArrayBuffer(90000 - instructions.length));
    patched_image = _appendBuffer(patched_image, base_image.slice(image_index + 90000));
    return patched_image;
}

async function handler_image_picker() {
    resultdisplay.innerText = "converting image...";
    console.log(":3");

    let h_instructions = await gen_instructions(false);
    let v_instructions = await gen_instructions(true);
    let instructions = h_instructions.length < v_instructions.length ? h_instructions : v_instructions;

    // assumes 25ms per cycle + 1.5 seconds for initial wait commands
    exec_mins = Math.floor((1500 + (instructions.length * 25)) / 1000 / 60);

    let patched_image = await patch_base_splork_image(BASE_SPLORK_IMAGE, instructions, BASE_SPLORK_IMAGE_INDEX);

    // saveByteArray("splork_modded.bin", patched_image);

    let uf2_image = await convert_to_uf2(patched_image);
    let uf2_filename = "splork_modded_" + new Date().toISOString().replaceAll(":", "_") + ".uf2";
    saveByteArray(uf2_filename, uf2_image);

    resultdisplay.innerText = (
        "Done, downloading uf2 image. Hold boot button on Pi Pico while plugging it into your computer and copy the uf2 file into it. (Expected drawing time = ~" + exec_mins + "mins.)"
    )
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

get_splork_base_image();
