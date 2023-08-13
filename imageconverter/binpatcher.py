import instructionconverter
import sys

if __name__ == "__main__":
    old_instructions = bytes([0x69] * 90000)

    new_img_filename = sys.argv[1]
    new_instructions = instructionconverter.get_smaller_instructions(
        new_img_filename, False, print_direction=True, save_directions=False
    )

    if len(new_instructions) > 90000:
        print("Instructions too big, can't continue.")
        sys.exit(1)

    # pad new instructions with NOOP
    new_instructions += [instructionconverter.NOOP] * (90000 - len(new_instructions))

    assert len(old_instructions) == len(new_instructions)

    with open("../build/flash.bin", "rb") as f:
        flash_data = f.read()

    instructions_index = flash_data.index(old_instructions)

    new_flash_data = flash_data.replace(
        bytes(old_instructions), bytes(new_instructions)
    )

    with open("../build/newflash.bin", "wb") as f:
        f.write(new_flash_data)
