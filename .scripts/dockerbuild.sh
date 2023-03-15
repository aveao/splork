#!/bin/bash

# fail the build if instruction file fails to build
set -e

IMAGE_PATH=$(realpath "$1")

# build and copy the instruction file
cd imageconverter/; python3 instructionconverter.py $IMAGE_PATH; cd ..
cp imageconverter/drawing.h rp2040src/

# build the image
mkdir -p rp2040src/build
cd rp2040src/build; cmake ..; make
