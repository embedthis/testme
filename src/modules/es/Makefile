#
#	module/es - Makefile to install the testme.mod
#
all: build

build: testme.mod
	@true

testme.mod: testme.es
	ejsc testme.es

install:
	mkdir -p ~/.ejs
	cp testme.mod ~/.ejs/testme.mod
	sudo mkdir -p /usr/local/lib/testme
	sudo cp testme.mod /usr/local/lib/testme
