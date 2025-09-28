# TestMe Documentation

## Man Page

The `tm.1` file is a Unix-style manual page for the TestMe tool.

### Viewing the Man Page

To view the man page locally:

```bash
# Using man (if installed in system man path)
man tm

# Or view directly with man
man ./doc/tm.1

# Or format with groff (if available)
groff -man -Tascii doc/tm.1 | less

# Or format with nroff (if available)
nroff -man doc/tm.1 | less
```

### Installing the Man Page

To install the man page system-wide:

```bash
# Copy to appropriate man directory (may require sudo)
sudo cp doc/tm.1 /usr/local/share/man/man1/
sudo mandb  # Update man database (Linux)
```

### Man Page Sections

The man page includes:

- **NAME** - Brief description
- **SYNOPSIS** - Command syntax
- **DESCRIPTION** - Detailed explanation
- **OPTIONS** - All command-line options
- **PATTERNS** - Test pattern matching
- **TEST TYPES** - Supported test file types
- **CONFIGURATION** - Configuration file format
- **ARTIFACTS** - Build artifact management
- **PARALLEL EXECUTION** - Concurrency details
- **ENVIRONMENT VARIABLES** - Environment setup
- **EXIT STATUS** - Return codes
- **EXAMPLES** - Usage examples
- **FILES** - Important files
- **DEBUGGING** - Debug mode usage
- **TROUBLESHOOTING** - Common issues
- **SEE ALSO** - Related commands
- **AUTHOR** - Attribution
- **COPYRIGHT** - License information

### Format

The man page follows standard Unix manual conventions:
- Section 1 (user commands)
- Standard troff/groff formatting
- Proper cross-references
- Comprehensive examples
- Troubleshooting guidance