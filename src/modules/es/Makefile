#
#	modules/es - Makefile to install the legacy Ejscript testme.mod
#
all: build

build: testme.mod
	@true

testme.mod: testme.es
	if ! which ejsc > /dev/null 2>&1; then \
		echo "ejsc not found, skipping testme.mod build"; \
	else \
		ejsc testme.es
	fi

install:
	mkdir -p ~/.local/lib/testme
	cp testme.mod ~/.local/lib/testme/testme.mod
