#!/bin/bash

# fail the build if instruction file fails to build
set -e

# build and copy the instruction file
cp imageconverter/placeholder_drawing.h rp2040src/drawing.h

# build the image
mkdir -p rp2040src/build
cd rp2040src/build; make; cd ../..

# move resulting images
cp rp2040src/build/splork.uf2 build/
cp rp2040src/build/splork.bin build/

# build the offset file
cd imageconverter; python3 offset_file_gen.py; cd ..
