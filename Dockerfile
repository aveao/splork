FROM python:3.11-buster

ENV PICO_SDK_PATH="/picosdk"

RUN git clone https://github.com/raspberrypi/pico-sdk.git "$PICO_SDK_PATH" -b master --depth 1 --recursive --shallow-submodules
RUN apt update && apt -y install cmake gcc-arm-none-eabi libnewlib-arm-none-eabi build-essential

WORKDIR /app

COPY imageconverter imageconverter
RUN pip3 install -Ur imageconverter/requirements.txt

COPY rp2040src rp2040src
RUN mkdir -p rp2040src/build
RUN cd rp2040src/build; cmake ..

COPY .scripts .scripts
ENTRYPOINT [".scripts/dockerbuild.sh"]
