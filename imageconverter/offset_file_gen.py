import json

if __name__ == "__main__":
    old_instructions = bytes([0x69] * 90000)

    with open("../build/splork.bin", "rb") as f:
        flash_data = f.read()

    instructions_index = flash_data.index(old_instructions)

    with open("../build/splork_offset.json", "w") as f:
        json.dump({"offset": instructions_index}, f)
