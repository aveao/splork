cmake_minimum_required(VERSION 3.13)

include(pico_sdk_import.cmake)

project(splork_project C CXX ASM)
set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)
pico_sdk_init()

add_executable(splork)

target_sources(splork PUBLIC
        ${CMAKE_CURRENT_LIST_DIR}/main.c
        ${CMAKE_CURRENT_LIST_DIR}/usb_descriptors.c
        )

pico_enable_stdio_usb(splork 1)
pico_enable_stdio_uart(splork 1)

pico_add_extra_outputs(splork)

target_include_directories(splork PRIVATE ${CMAKE_CURRENT_LIST_DIR} )

target_link_libraries(splork pico_stdlib tinyusb_device tinyusb_board)

