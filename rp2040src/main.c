/* 
 * The MIT License (MIT)
 *
 * Copyright (c) 2022 ave oezkal (ave.zone)
 * Copyright (c) 2019 Ha Thach (tinyusb.org)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#include "bsp/board.h"
#include "tusb.h"

#include "SwitchDescriptors.h"
#include "drawing.h"

void drawing_task(void);

/*------------- MAIN -------------*/
int main(void)
{
    board_init();
    tusb_init();

    // prepare_drawing();
    board_led_write(true);

    while (1) {
        tud_task();

        drawing_task();
    }

    return 0;
}

//--------------------------------------------------------------------+
// USB HID
//--------------------------------------------------------------------+

static void send_hid_report(uint16_t buttons, uint8_t hat)
{
    // skip if hid is not ready yet
    if ( !tud_hid_ready() ) return;

    SwitchOutReport out_report =
    {
        .buttons = buttons,
        .hat = hat,
        .lx = SWITCH_JOYSTICK_MID,
        .ly = SWITCH_JOYSTICK_MID,
        .rx = SWITCH_JOYSTICK_MID,
        .ry = SWITCH_JOYSTICK_MID
    };

    tud_hid_report(0, &out_report, sizeof(out_report));
}

void drawing_task(void)
{
    const uint32_t interval_ms = 25;
    static uint32_t start_ms = 0;

    if (board_millis() - start_ms < interval_ms) return; // not enough time
    start_ms += interval_ms;

    static bool start_drawing = false;
    static uint32_t drawing_instructions_progress = 0;

    uint16_t buttons = 0;
    uint8_t hat = SWITCH_HAT_NOTHING;

    if (!start_drawing) {
        if (board_button_read()) {
            start_drawing = true;
        } else {
            send_hid_report(buttons, hat);
            return;
        }
    }

    uint8_t instruction = drawing_instructions[drawing_instructions_progress];

    buttons |= (instruction & 1) ? SWITCH_MASK_A : 0;
    buttons |= (instruction & 2) ? SWITCH_MASK_B : 0;
    buttons |= (instruction & 64) ? (SWITCH_MASK_L | SWITCH_MASK_L3) : 0;

    // TODO: clean this up
    if (instruction & 4) {
        if (instruction & 16) {
            hat = SWITCH_HAT_UPRIGHT;
        } else if (instruction & 32) {
            hat = SWITCH_HAT_DOWNRIGHT;
        } else {
            hat = SWITCH_HAT_RIGHT;
        }
    } else if (instruction & 8) {
        if (instruction & 16) {
            hat = SWITCH_HAT_UPLEFT;
        } else if (instruction & 32) {
            hat = SWITCH_HAT_DOWNLEFT;
        } else {
            hat = SWITCH_HAT_LEFT;
        }
    } else if (instruction & 16) {
        hat = SWITCH_HAT_UP;
    } else if (instruction & 32) {
        hat = SWITCH_HAT_DOWN;
    }

    board_led_write(instruction & 1);

    send_hid_report(buttons, hat);
    drawing_instructions_progress++;
    if (instruction & 128) {
        sleep_ms(500);
    }
    if (drawing_instructions_progress == sizeof(drawing_instructions)) {
        drawing_instructions_progress = 0;
        start_drawing = false;
    }
}

// Invoked when received GET_REPORT control request
// Application must fill buffer report's content and return its length.
// Return zero will cause the stack to STALL request
uint16_t tud_hid_get_report_cb(uint8_t instance, uint8_t report_id, hid_report_type_t report_type, uint8_t* buffer, uint16_t reqlen)
{
    return 0;
}


// Invoked when received SET_REPORT control request or
// received data on OUT endpoint ( Report ID = 0, Type = 0 )
void tud_hid_set_report_cb(uint8_t itf, uint8_t report_id, hid_report_type_t report_type, uint8_t const *buffer, uint16_t bufsize)
{
    return;
}
