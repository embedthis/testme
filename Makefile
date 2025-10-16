#
#	Makefile - Build and install the TestMe project
#
MFLAGS := --no-print-directory

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
	bun build ./testme.ts --compile --minify --outfile dist/tm
	@make -C src/modules/c build $(MFLAGS)
	@make -C src/modules/js build $(MFLAGS)
	@make -C src/modules/es build $(MFLAGS)

test: build
	tm test

install: build
	@echo Installing
	bun bin/install.mjs

#
#	Local dev env install
#
dev-install: build
	bun --quiet link
	cp dist/tm ~/.bun/bin
	cp doc/tm.1 ~/.local/share/man/man1
	@make -C src/modules/c install $(MFLAGS)
	@make -C src/modules/js install $(MFLAGS)
	@make -C src/modules/es install $(MFLAGS)

clean: tidy
	rm -f dist/tm
	rm -fr test/.testme
	rm -fr test/*/.testme

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
