from PIL import Image
import sys

CANVAS_WIDTH = 320
CANVAS_HEIGHT = 120

NOOP = 0
A = 1
B = 2
RIGHT = 4
LEFT = 8
UP = 16
DOWN = 32
L1_L3 = 64
WAIT = 128


def get_color_button_press(r, g, b, intended_a, is_cleanup_round):
    instruction = 0
    # skip transparent pixels
    if not intended_a:
        return instruction

    if (r, g, b) == (0, 0, 0):
        instruction = A
    # only do B presses on cleanup rounds
    elif (r, g, b) == (255, 255, 255) and is_cleanup_round:
        instruction = B
    return instruction


def get_x_y(line, line_progress, vertical_mode):
    x = line if vertical_mode else line_progress
    y = line_progress if vertical_mode else line
    return x, y


def get_correct_pixel(intended, line, line_progress, reversed_line, vertical_mode):
    corrected_line_progress = (
        (get_line_progress_size(vertical_mode) - 1) - line_progress
        if reversed_line
        else line_progress
    )
    x, y = get_x_y(line, corrected_line_progress, vertical_mode)
    return intended.getpixel((x, y))


def is_line_empty(intended, line, vertical_mode):
    for line_progress in range(get_line_progress_size(vertical_mode)):
        x, y = get_x_y(line, line_progress, vertical_mode)
        r, g, b, intended_a = intended.getpixel((x, y))
        if get_color_button_press(r, g, b, intended_a, False) == A:
            return False
    return True


def get_moving_direction_key(vertical_mode):
    return RIGHT if vertical_mode else DOWN


def get_drawing_direction_key(reversed_line, vertical_mode):
    if vertical_mode:
        return UP if reversed_line else DOWN
    else:
        return LEFT if reversed_line else RIGHT


def get_line_size(vertical_mode):
    return CANVAS_WIDTH if vertical_mode else CANVAS_HEIGHT


# TODO: better name for line progress maybe?
def get_line_progress_size(vertical_mode):
    return CANVAS_HEIGHT if vertical_mode else CANVAS_WIDTH


def gen_instructions(
    intended_filename, is_cleanup_round, vertical_mode, overdraw_amount=10
):
    intended = Image.open(intended_filename).convert("RGBA")
    assert intended.size == (320, 120), "image size is incorrect, should be 320x120"

    instructions = []
    reversed_line = False

    # Up here is just to help switch recognize that we're here.
    instructions += [UP, WAIT, A, WAIT, A, WAIT]

    # Move to top left
    instructions += [UP + LEFT, NOOP] * CANVAS_WIDTH

    # If we're not just doing cleanups, reset canvas and set size
    if not is_cleanup_round:
        instructions.append(L1_L3)

    # Give it some time to settle
    instructions += [NOOP] * 50

    # Draw image
    for line in range(get_line_size(vertical_mode)):
        # Give it some time to settle
        instructions += [NOOP] * 10

        # skip empty lines
        if is_line_empty(intended, line, vertical_mode):
            instructions += [get_moving_direction_key(vertical_mode), NOOP]
            continue

        # prepare draw and move presses
        for line_progress in range(get_line_progress_size(vertical_mode)):
            r, g, b, intended_a = get_correct_pixel(
                intended, line, line_progress, reversed_line, vertical_mode
            )
            draw_instruction = get_color_button_press(
                r, g, b, intended_a, is_cleanup_round
            )
            move_instruction = get_drawing_direction_key(reversed_line, vertical_mode)

            instructions += [draw_instruction, move_instruction]

        # overdraw
        instructions += [
            get_drawing_direction_key(reversed_line, vertical_mode),
            NOOP,
        ] * overdraw_amount

        # Move to the next line
        instructions += [get_moving_direction_key(vertical_mode), NOOP]
        reversed_line = not reversed_line

    instructions_str = [str(instruction) for instruction in instructions]

    # TODO: this is ugly, can we clean it up?
    file_text = (
        "const uint8_t drawing_instructions["
        + str(len(instructions))
        + "] = {\n"
        + ", ".join(instructions_str)
        + "\n};"
    )

    return len(instructions), file_text


if __name__ == "__main__":
    intended_img_filename = sys.argv[1]

    # TODO: change this, argparse?
    is_cleanup_round = "diff" in intended_img_filename
    if not is_cleanup_round:
        print(
            "Note: This run is not marked as cleanup round and "
            "will clear the canvas."
        )

    h_count, h_instructions = gen_instructions(
        intended_img_filename, is_cleanup_round, False
    )
    with open("drawing_h.h", "w") as f:
        f.write(h_instructions)

    v_count, v_instructions = gen_instructions(
        intended_img_filename, is_cleanup_round, True
    )
    with open("drawing_v.h", "w") as f:
        f.write(v_instructions)

    if h_count < v_count:
        instructions_str = h_instructions
        count = h_count
        print("Doing horizontal drawing.")
    else:
        instructions_str = v_instructions
        count = v_count
        print("Doing vertical drawing.")

    # assumes 25ms per cycle + 1.5 seconds for initial wait commands
    exec_mins = int((1500 + (count * 25)) / 1000 / 60)

    print(f"Expected drawing time is ~{exec_mins} minutes.")

    with open("drawing.h", "w") as f:
        f.write(instructions_str)
