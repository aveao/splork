# splork

splatoon 3 art drawer/printer for pi pico (or any other RP2040 board)

[![video demo of splork](https://thumbs.gfycat.com/SlimyFoolhardyBernesemountaindog-size_restricted.gif)](https://gfycat.com/slimyfoolhardybernesemountaindog)

## easy setup: using docker

### preparing your image

you're recommended to create a 320x120 PNG file using your favorite image editor, ideally with only black and white pixels. pixels that are neither will be ignored. transparent pixels will be ignored. for sample images, see `sampleimages` folder under `images`.

you can use gimp to generate properly dithered images by selecting `Image->Mode->Indexed` and then picking `Use black and white (1-bit) palette`. you should also pick one of the Floyd-Steinberg color ditherings in the same menu.

### patching splork with your image

Open https://splork.ave.zone, and upload your image, patch it then download the uf2 file.

### flashing rp2040

- while holding down `BOOTSEL` button on your board, plug it onto your computer.
- copy the splork uf2 file to the newly mounted `RPI-RP2` drive.

### drawing

- open drawing screen on your switch.
    - tip: if docked, disconnect all other controllers to ensure the "connect your controller" UI is visible.
- connect your board with a USB cable to your switch, either while it's docked or with a USB C to A cable.
    - tip: draw sessions can take upwards of 40 minutes (converter will give you a better figure based on your image), which obviously has battery implications. to ensure your drawing session isn't cut short, you're strongly recommended to keep your switch docked.
- shortly press the `BOOTSEL` button on the board to start drawing.

if you have any drifted lines etc, or if you just want to add a small change, see the "doing drawing cleanups" section.

## optional advanced setup: building splork manually or with docker

see [MANUAL_SETUP.md](/MANUAL_SETUP.md) for more info on this.

## doing drawing cleanups

you can use diffgen with `diffgen/diffgen.py`. you'll want to feed it the intended drawing image, and a screenshot of the switch. both 720p screenshots and 1080p frame-grabs from capture cards are accounted for, with 1080p frame-grab pngs recommended.

example command: `python3 diffgen.py ../imageconverter/sampleimages/testcard.png switchscreenshot.jpg`

this will output a `diffresult.png` image that you can then throw to `instructionconverter`, flash to pi and have another go with.

do note:
- 720p is not well tested.
- right now cleanups involving B presses are a bit buggy.

## reasonable questions and hopefully reasonable answers

### what's up with the name

splatoon -> sploon -> spoon -> spork -> splork

### my drawing wasn't perfect, some lines drifted!

that happens, unfortunately, and I haven't found a good way to prevent that. overdraws and waiting after each line helps, but those work more for reducing the resulting damage to one line instead of two or more.

my recommendation is use diffgen to do a second run to fix up those lines ("cleanup run"), see "doing drawing cleanups" section for more info.

### why is the codebase designed like this

this is actually the third complete rewrite of this code.

iter 1 and 2 included the image->button press logic directly in the C code, however this was ugly (as I ended up keeping it mostly in the shape of a state machine, it grew a ton and became hard to read and maintain) and came with limitations (most notably, I want to eventually support transfering instructions on its own without the need to reflash, and that'd limit the drawings to be possible to be drawn in one specific drawing algorithm only).

iter 3 offloads practically all the logic to external code, and while this makes it less impressive on its own, in the end the UX is the same (previously you'd need to convert the image to a C array with a script anyways), but code is cleaner and easier to work with. the resulting image is larger, but that's a compromise I'm willing to make.

## todos

- improve B button reliability on cleanups
- pi pico w support for uploading instructions directly through web
- better drawing instructions for faster drawing, a la https://github.com/Victrid/splatplost

## licenses

- All code is MIT. Parts are based on other MIT projects, see "credits" section below for more detail.
- All sample images are licensed under a [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/), unless otherwise stated. The sample images may be posted as drawings to Splatoon 3 without extra attribution, social media posts associated with said drawings must include attribution.

## credits

- the rp2040 codebase is vaguely based on the official dev_hid_composite example project
- the `SwitchDescriptors.h` file is from https://github.com/FeralAI/MPG (MIT)
