#
#
#
all: build

build:
	ejsc testme.es

install:
	mkdir -p ~/.ejs
	cp testme.mod ~/.ejs/testme.mod
	sudo mkdir -p /usr/local/lib/testme
	sudo cp testme.mod /usr/local/lib/testme
