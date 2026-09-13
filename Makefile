# CodePrep CLI convenience wrapper
.PHONY: context context-pack help

help:
	@echo "CodePrep CLI commands:"
	@echo "  make context TASK=\"...\"        Run repository context preparation"
	@echo "  make context-pack TASK=\"...\"   Run repository context preparation with context pack"

context:
	npm run context -- --task "$(TASK)"

context-pack:
	npm run context -- --task "$(TASK)" --pack
