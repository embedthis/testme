#
#	Makefile - Build and install the TestMe project
#
all: build tidy

#
#  Install required dependencies
#
prep:
	bun install

#
#  Build the project. Builds the tm binary and the support files.
#
build:
	node bin/update-version.mjs
	bun build ./testme.ts --compile --outfile dist/tm
	@make -C src/modules/c build
	@make -C src/modules/js build
	@make -C src/modules/es build

test: build
	tm test

install: build
	@echo Installing
	bun bin/install.mjs

#
#  Old install method
#
old-install: build
	bun --quiet link
	sudo cp dist/tm /usr/local/bin/tm
	sudo cp doc/tm.1 /usr/local/share/man/man1
	@make -C src/modules/c install
	@make -C src/modules/js install
	@make -C src/modules/es install

clean: tidy
	rm -f dist/tm
	rm -fr test/.testme

#
#  Remove bun artifacts
#
tidy:
	@rm -f .*.bun-build

.PHONY: prep run build test install tidy clean

LOCAL_MAKEFILE := $(strip $(wildcard ./.local.mk))

ifneq ($(LOCAL_MAKEFILE),)
include $(LOCAL_MAKEFILE)
endif
