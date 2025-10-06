#
#	module/es - Makefile to install the testme.mod
#
all: build

build: testme.mod
	@true

testme.mod: testme.es
	ejsc testme.es

install:
	mkdir -p ~/.local/lib/testme
	cp testme.mod ~/.local/lib/testme/testme.mod
