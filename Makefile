#/*****************************************************************************
# * File Makefile instructs GNU make to build the components of the program.
# *
# * Author: Jonathan Wesley Stone
# * E-Mail: jstone25@uco.edu
# * Date: August 14, 2014
# *
# * Copyright: Jonathan Wesley Stone, 2014
# ****************************************************************************/
CXX=clang
BASE_FLAGS=-std=c++98 -Wall -pedantic -I. -g3
CXXFLAGS=$(BASE_FLAGS)
OBJECTS=pcodeprogram.o pcodeline.o
LDFLAGS=-lstdc++

all: pcodevsim

pcodevsim: pcodevsim.cpp $(OBJECTS)

pcodeprogram.o: pcodeprogram.cpp pcodeprogram.h

pcodeline.o: pcodeline.cpp pcodeline.h

clean:
	- rm -f pcodevsim $(OBJECTS) tests/test_main

test: LDFLAGS=-lstdc++ -lpthread googletest/make/gtest_main.a $(OBJECTS)
test: CXXFLAGS=$(BASE_FLAGS) -Igoogletest/include
test: gtest $(OBJECTS) tests/test_main
	./tests/test_main

gtest:
	(cd googletest/make && make)

gclean: clean
	- rm -f googletest/make/gtest-all.o googletest/make/gtest_main.a \
    googletest/make/gtest_main.o googletest/make/sample1.o \
    googletest/make/sample1_unittest googletest/make/sample1_unittest.o

