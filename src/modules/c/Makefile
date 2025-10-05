#
#	module/c - Makefile to install the testme.h
#
all: build

build: ../../../test/testme.h
	@true

../../../test/testme.h: testme.h
	cp testme.h ../../../test

install:
	sudo cp testme.h /usr/local/include/testme.h
