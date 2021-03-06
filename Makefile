
#
# Project
#
package-lock.json:	package.json
	touch $@
node_modules:		package-lock.json
	npm install
	touch $@
LAIR			= lair/socket
.PHONY:			$(LAIR)
lair:
	mkdir lair
$(LAIR):
	RUST_LOG=trace lair-keystore -d ./lair > lair.log 2>&1 &
test-setup:		$(LAIR)
stop-lair:
	kill $$(cat lair/pid) && rm lair/pid lair/socket lair/store

#
# Testing
#
test:
	make test-unit test-integration
test-debug:
	make test-unit-debug test-integration-debug
test-unit:		test-setup
	npx mocha ./tests/unit
test-unit-debug:	test-setup
	LOG_LEVEL=silly npx mocha ./tests/unit
test-integration:	test-setup
	npx mocha ./tests/integration
test-integration-debug:	test-setup
	LOG_LEVEL=silly npx mocha ./tests/integration

lair-fixed.log:		lair.log
	sed 's/\x1b\[2mNov 27 08/2020-11-27T15/' lair.log > lair-fixed.log # change dates to work
read-logs:		lair-fixed.log
	cat test.log lair-fixed.log | sort > merged.log
	less -R merged.log


#
# Repository
#
clean-remove-chaff:
	@find . -name '*~' -exec rm {} \;
clean-files:		clean-remove-chaff
	git clean -nd
clean-files-force:	clean-remove-chaff
	git clean -fd
clean-files-all:	clean-remove-chaff
	git clean -ndx
clean-files-all-force:	clean-remove-chaff
	git clean -fdx


#
# NPM
#
preview-package:	clean-files test
	npm pack --dry-run .
create-package:		clean-files test
	npm pack .
publish-package:	clean-files test
	npm publish --access public .
