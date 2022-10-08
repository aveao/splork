import math
import sys
from PIL import Image

BLACK = (0, 0, 0, 255)
WHITE = (255, 255, 255, 255)
GRAY = (0, 0, 0, 0)
TRANSPARENT = (0, 0, 0, 0)

CANVAS_WIDTH = 320
CANVAS_HEIGHT = 120

CANVAS_START_X_1080 = 240
CANVAS_START_Y_1080 = 282
CANVAS_RATIO_1080 = 4.5

CANVAS_START_X_720 = 161
CANVAS_START_Y_720 = 189
CANVAS_RATIO_720 = 3


# this func should match the logic in instructionconverter.py
def get_pixel_color_intended(r, g, b):
    if (r, g, b) == (0, 0, 0):
        return BLACK
    elif (r, g, b) == (255, 255, 255):
        return WHITE
    return TRANSPARENT


# TODO: rewrite this
def get_pixel_color_canvas(r, g, b, is_1080):
    """
    Returns the interpreted color of the given RGB value from canvas
    Possible options are BLACK, GRAY, WHITE (global tuples)
    """

    rgb_total = r + g + b
    is_black = rgb_total < ((100 * 3) if is_1080 else (10 * 3))
    is_gray = (
        (not is_black)  # black cutoff does not cover gray
        and (rgb_total < (150 * 3))  # combination of 150 seems to cover all gray bits
        and (b < 160)  # bottom layer's purple consistently is over 160
    )
    return BLACK if is_black else (GRAY if is_gray else WHITE)


def extract_canvas(filename):
    screenshot = Image.open(filename)
    extracted_canvas = Image.new(mode="RGBA", size=(CANVAS_WIDTH, CANVAS_HEIGHT))
    assert screenshot.size in [
        (1920, 1080),
        (1280, 720),
    ], "screenshot should be 1920x1080/1280x720"
    is_1080 = screenshot.size == (1920, 1080)
    CANVAS_START_X = CANVAS_START_X_1080 if is_1080 else CANVAS_START_X_720
    CANVAS_START_Y = CANVAS_START_Y_1080 if is_1080 else CANVAS_START_Y_720
    CANVAS_RATIO = CANVAS_RATIO_1080 if is_1080 else CANVAS_RATIO_720

    for y in range(CANVAS_HEIGHT):
        for x in range(CANVAS_WIDTH):
            r, g, b = screenshot.getpixel(
                (
                    CANVAS_START_X + math.ceil(x * CANVAS_RATIO),
                    CANVAS_START_Y + math.ceil(y * CANVAS_RATIO),
                )
            )

            extracted_canvas.putpixel(
                (x, y),
                get_pixel_color_canvas(r, g, b, is_1080),
            )

    return extracted_canvas


def gen_diff(filename, intended):
    diff_count = 0

    extracted_canvas = extract_canvas(filename)
    extracted_canvas.save("extracted_canvas.png")
    intended = Image.open(intended)
    result_transparent = Image.new(mode="RGBA", size=(CANVAS_WIDTH, CANVAS_HEIGHT))

    for y in range(CANVAS_HEIGHT):
        for x in range(CANVAS_WIDTH):
            r, g, b, intended_a = intended.getpixel((x, y))
            intended_color = get_pixel_color_intended(r, g, b)

            r, g, b, canvas_a = extracted_canvas.getpixel((x, y))
            canvas_color = get_pixel_color_canvas(r, g, b, True)

            if intended_color == canvas_color:
                result_transparent.putpixel((x, y), TRANSPARENT)
            # Ignore transparent pixels
            elif intended_a == 0 or canvas_a == 0:
                result_transparent.putpixel((x, y), TRANSPARENT)
            else:
                result_transparent.putpixel((x, y), intended_color)
                diff_count += 1

    print(f"{diff_count} pixels to go")
    return result_transparent


if __name__ == "__main__":
    gen_diff(sys.argv[2], sys.argv[1]).save("diffresult.png")
