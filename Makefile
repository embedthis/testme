all: build tidy

prep:
	bun install

run:
	bun run ./testme.ts

build:
	bun build ./testme.ts --compile --outfile tm

test:
	bun run test

install:
	sudo mkdir -p /usr/local/lib/testme
	sudo cp tm /usr/local/bin/tm
	sudo cp test/testme.h /usr/local/include/testme.h
	sudo cp doc/tm.1 /usr/local/share/man/man1
	make -C src/modules/js build install
	make -C src/modules/es build install

tidy:
	rm -f .*.bun-build

clean: tidy
	rm -f tm

