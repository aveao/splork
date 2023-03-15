## generating instruction files

### installing dependencies

- you'll need python 3.6+.
- install `requirements.txt` with `pip3 install -Ur requirements.txt`.

### preparing your image

you're recommended to create a 320x120 PNG file using your favorite image editor, ideally with only black and white pixels. pixels that are neither will be ignored. transparent pixels will be ignored. for sample images, see `sampleimages` folder under `images`.

### finally, generating the file

- run `python3 instructionconverter.py filenamegoeshere.png`.
- this will generate both a vertical and horizontal drawing instruction, pick the one that has the shorter draw time, and save it as `drawing.h`. it will also print the draw time.
- you're done. proceed to building the rp2040 image using your `drawing.h` file.
    - if you specifically want to draw vertically or horizontally, you can rename `drawing_v.h`/`drawing_h.h` to `drawing.h` and use that instead.

## deploying to rp2040

### installing dependencies

you're strongly recommended to use linux. support will not be provided for other operating systems.

follow instructions on the official [getting started guide pdf, chapter 2](https://datasheets.raspberrypi.com/pico/getting-started-with-pico.pdf) to install the sdk and the toolchain.

### building image

- copy your intended `drawing.h` file to the `rp2040src` folder (see "generating instruction files" section above for more info).
    - tip: this is usually `cp imageconverter/drawing.h rp2040src/` from the project base.
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

- while holding down `BOOTSEL` button on your board, plug it onto your computer.
- copy `splork.uf2` from `rp2040src/build/` to the newly mounted `RPI-RP2` drive.

### drawing

- open drawing screen on your switch.
    - tip: if docked, disconnect all other controllers to ensure the "connect your controller" UI is visible.
- connect your board with a USB cable to your switch, either while it's docked or with a USB C to A cable.
    - tip: draw sessions can take upwards of 40 minutes (converter will give you a better figure based on your image), which obviously has battery implications. to ensure your drawing session isn't cut short, you're strongly recommended to keep your switch docked.
- shortly press the `BOOTSEL` button on the board to start drawing.

if you have any drifted lines etc, or if you just want to add a small change, see the "doing drawing cleanups" section.
