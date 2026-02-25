cmake_minimum_required(VERSION 3.16)

project(LayerMind VERSION 0.1 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Qt6 6.4 REQUIRED COMPONENTS Quick Widgets)

qt_standard_project_setup()

qt_add_executable(appLayerMind
    main.cpp
    mainwindow.h
    mainwindow.cpp
)

set_target_properties(appLayerMind PROPERTIES
    WIN32_EXECUTABLE TRUE
)

target_link_libraries(appLayerMind PRIVATE
    Qt6::Quick
    Qt6::Widgets
)

include(GNUInstallDirs)
install(TARGETS appLayerMind
    BUNDLE DESTINATION .
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)