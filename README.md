# splork

splatoon 3 art drawer/printer for pi pico (or any other RP2040 board)

[![video demo of splork](https://thumbs.gfycat.com/SlimyFoolhardyBernesemountaindog-size_restricted.gif)](https://gfycat.com/slimyfoolhardybernesemountaindog)

## generating instruction files

### installing dependencies

- you'll need python 3.6+
- install `requirements.txt` with `pip3 install -Ur requirements.txt`

### preparing your image

you're recommended to create a 320x120 PNG file using your favorite image editor, ideally with only black and white pixels. pixels that are neither will be ignored. transparent pixels will be ignored. for sample images, see `sampleimages` folder under `imageconverter`.

### finally, generating the file

- run `python3 instructionconverter.py filenamegoeshere.png`
- this will generate both a vertical and horizontal drawing instruction, pick the one that has the shorter draw time, and save it as `drawing.h`. it will also print the draw time.
- you're done. proceed to building the rp2040 image using your `drawing.h` file.
    - if you specifically want to draw vertically or horizontally, you can rename `drawing_v.h`/`drawing_h.h` to `drawing.h` and use that instead.

## deploying to rp2040

### installing dependencies

you're strongly recommended to use linux. support will not be provided for other operating systems.

follow instructions on the official [getting started guide pdf, chapter 2](https://datasheets.raspberrypi.com/pico/getting-started-with-pico.pdf) to install the sdk and the toolchain.

### building image

- copy your intended `drawing.h` file to the `rp2040src` folder (see "generating instruction files" section above for more info)
    - tip: this is usually `cp imageconverter/drawing.h rp2040src/` from the project base
- enter the `rp2040src` folder and run the following commands:
```bash
mkdir build
cd build
export PICO_SDK_PATH=/your/pico-sdk/path-goes-here
cmake ..
make
```
- on subsequent builds you only need to run `cd build`, the `export` command and `make`

### flashing rp2040

- while holding down `BOOTSEL` button on your board, plug it onto your computer
- copy `splork.uf2` from `rp2040src/build/` to the newly mounted `RPI-RP2` drive

### drawing

- open drawing screen on your switch.
    - tip: if docked, disconnect all other controllers to ensure the "connect your controller" UI is visible (shortly press small button on them).
- connect your board with a USB cable to your switch, either while it's docked or with a USB C to A cable
    - tip: draw sessions can take upwards of 40 minutes (converter will give you a better figure based on your image), which obviously has battery implications. to ensure your drawing session isn't cut short, you're strongly recommended to keep your switch docked.
- shortly press the `BOOTSEL` button on the board to start drawing.

## reasonable questions and hopefully reasonable answers

### what's up with the name

splatoon -> sploon -> spoon -> spork -> splork

### my drawing wasn't perfect, some lines drifted!

that happens, unfortunately, and I haven't found a good way to prevent that. overdraws and waiting after each line helps, but those work more for reducing the resulting damage to one line instead of two or more.

my recommendation is use diffgen to do a second run to fix up those lines ("cleanup run").

### why is the codebase designed like this

this is actually the third complete rewrite of this code.

iter 1 and 2 included the image->button press logic directly in the C code, however this was ugly (as I ended up keeping it mostly in the shape of a state machine, it grew a ton and became hard to read and maintain) and came with limitations (most notably, I want to eventually support transfering instructions on its own without the need to reflash, and that'd limit the drawings to be possible to be drawn in one specific drawing algorithm only).

iter 3 offloads practically all the logic to external code, and while this makes it less impressive on its own, in the end the UX is the same (previously you'd need to convert the image to a C array with a script anyways), but code is cleaner and easier to work with. the resulting image is larger, but that's a compromise I'm willing to make.

## todos

- cleanup and publish of diffgen for easier cleanup images
- docker support
- pi pico w support for uploading instructions directly to flash without need to re-compile or re-flash image
- better drawing instructions for faster drawing, a la https://github.com/Victrid/splatplost

## licenses

- All code is MIT. Parts are based on other MIT projects, see "credits" section below for more detail.
- All sample images are licensed under a [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/), unless otherwise stated. The sample images may be posted as drawings to Splatoon 3 without extra attribution, social media posts associated with said drawings must include attribution.

## credits

- the rp2040 codebase is vaguely based on the official dev_hid_composite example project
- the `SwitchDescriptors.h` file is from https://github.com/FeralAI/MPG (MIT)
