import {PlatformDetector} from '../platform/detector.ts'

/**
 * Provides helpful error messages and installation instructions for common failures
 */
export class ErrorMessages {
    /**
     * Creates a helpful error message when a compiler is not found
     *
     * @param compilerName - Name of the missing compiler (gcc, clang, cl.exe, etc.)
     * @returns Formatted error message with installation instructions
     */
    static compilerNotFound(compilerName: string): string {
        const platform = PlatformDetector.detectPlatform()
        let instructions = ''

        if (compilerName.includes('cl.exe') || compilerName.includes('cl')) {
            // MSVC compiler
            instructions = `
Microsoft Visual C++ compiler (cl.exe) not found.

Installation options:
1. Install Visual Studio 2022 (recommended):
   - Download from: https://visualstudio.microsoft.com/downloads/
   - Select "Desktop development with C++" workload
   - After installation, run TestMe from "Developer Command Prompt for VS 2022"

2. Install Build Tools for Visual Studio 2022 (lighter):
   - Download from: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
   - Select "C++ build tools" workload

3. Alternative: Use MinGW GCC instead
   - Install via MSYS2: https://www.msys2.org/
   - Or use WSL with Linux GCC

After installation, either:
- Run TestMe from "Developer Command Prompt for VS 2022"
- Or add cl.exe to your PATH manually`
        } else if (compilerName.includes('gcc')) {
            if (platform === 'windows') {
                instructions = `
GCC compiler not found on Windows.

Installation options:
1. Install MinGW-w64 (recommended for Windows):
   - Via MSYS2: https://www.msys2.org/
   - After installation: pacman -S mingw-w64-x86_64-gcc
   - Add to PATH: C:\\msys64\\mingw64\\bin

2. Use Windows Subsystem for Linux (WSL):
   - Enable WSL: wsl --install
   - Install Ubuntu: wsl --install -d Ubuntu
   - Install GCC: sudo apt install build-essential

3. Alternative: Use Visual Studio's MSVC compiler instead
   - See cl.exe installation instructions above`
            } else if (platform === 'macos') {
                instructions = `
GCC compiler not found on macOS.

Installation options:
1. Install via Homebrew (recommended):
   - Install Homebrew: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   - Install GCC: brew install gcc
   - GCC will be available as gcc-13, gcc-14, etc.

2. Use Xcode's Clang instead (Apple's default):
   - Install Xcode Command Line Tools: xcode-select --install
   - Configure TestMe to use 'clang' instead of 'gcc'

Note: On macOS, the 'gcc' command is often aliased to Clang.
Use 'gcc --version' to check what you have.`
            } else {
                // Linux
                instructions = `
GCC compiler not found on Linux.

Installation instructions:
- Debian/Ubuntu: sudo apt install build-essential
- Fedora/RHEL: sudo dnf install gcc gcc-c++
- Arch Linux: sudo pacman -S base-devel
- openSUSE: sudo zypper install gcc gcc-c++

After installation, verify with: gcc --version`
            }
        } else if (compilerName.includes('clang')) {
            if (platform === 'windows') {
                instructions = `
Clang compiler not found on Windows.

Installation options:
1. Install LLVM with Clang:
   - Download from: https://releases.llvm.org/
   - Add to PATH: C:\\Program Files\\LLVM\\bin

2. Install via Visual Studio:
   - Install Visual Studio with "C++ Clang tools for Windows" component
   - Use from Developer Command Prompt

3. Alternative: Use GCC or MSVC instead`
            } else if (platform === 'macos') {
                instructions = `
Clang compiler not found on macOS.

Installation:
Install Xcode Command Line Tools:
  xcode-select --install

This installs Apple Clang, the default C compiler on macOS.

Verify installation:
  clang --version

Note: Apple Clang is slightly different from LLVM Clang.`
            } else {
                // Linux
                instructions = `
Clang compiler not found on Linux.

Installation instructions:
- Debian/Ubuntu: sudo apt install clang
- Fedora/RHEL: sudo dnf install clang
- Arch Linux: sudo pacman -S clang
- openSUSE: sudo zypper install clang

Verify installation: clang --version`
            }
        } else {
            // Generic compiler
            instructions = `
Compiler '${compilerName}' not found in PATH.

Common solutions:
1. Install the compiler using your system's package manager
2. Add the compiler's directory to your PATH
3. Specify the full path to the compiler in testme.json5:
   {
     compiler: {
       c: {
         compiler: '/full/path/to/${compilerName}'
       }
     }
   }

4. Use a different compiler that is already installed`
        }

        return `❌ Compiler Not Found: ${compilerName}
${instructions}

For more help, see: https://docs.embedthis.com/testme/installation/`
    }

    /**
     * Creates a helpful error message when testme.h is not found
     *
     * @param includePath - Path that was searched for testme.h
     * @returns Formatted error message with resolution steps
     */
    static testmeHeaderNotFound(includePath?: string): string {
        return `❌ Missing Header: testme.h not found

The C test file includes <testme.h> but it cannot be found.

Common causes and solutions:

1. TestMe headers not installed:
   Solution: Install TestMe headers to ~/.local/include (recommended)
   - Run: npm install -g @embedthis/testme (installs to ~/.local/include/testme.h)
   - Or manually copy testme.h to ~/.local/include/testme.h

2. TestMe headers in non-standard location:
   Add include path to testme.json5:
   {
     compiler: {
       c: {
         flags: ['-I/path/to/testme/headers']
       }
     }
   }

3. For local development (alternative):
   Copy testme.h to your test directory and use: #include "testme.h"
   Or use: #include <testme.h> if installed in system paths
${includePath ? `\nSearched in: ${includePath}` : ''}

For more help, see: https://docs.embedthis.com/testme/headers/`
    }

    /**
     * Creates a helpful error message for configuration file errors
     *
     * @param configPath - Path to the problematic config file
     * @param error - The original error
     * @returns Formatted error message with debugging hints
     */
    static configFileError(configPath: string, error: unknown): string {
        const errorMsg = error instanceof Error ? error.message : String(error)

        let hint = ''
        if (errorMsg.includes('JSON') || errorMsg.includes('parse')) {
            hint = `
Common JSON5 syntax errors:
- Missing comma between properties
- Unquoted property names (JSON5 allows this, but check for typos)
- Unclosed strings or brackets
- Comments not using // or /* */ syntax
- Trailing commas in wrong places

Tip: Use a JSON5 validator or linter to check your file.`
        } else if (errorMsg.includes('ENOENT')) {
            hint = `
The configuration file does not exist at this path.
- Check the file path is correct
- Verify the file exists: ls "${configPath}"
- Create a new config: tm --init`
        } else if (errorMsg.includes('EACCES')) {
            hint = `
Permission denied reading the configuration file.
- Check file permissions: ls -l "${configPath}"
- Fix permissions: chmod 644 "${configPath}"`
        }

        return `❌ Configuration Error in: ${configPath}

Error: ${errorMsg}
${hint}

Configuration file location: ${configPath}

For configuration documentation, see: https://docs.embedthis.com/testme/configuration/`
    }

    /**
     * Creates a helpful error message for missing dependencies
     *
     * @param dependency - Name of the missing dependency (python, go, etc.)
     * @returns Formatted error message with installation instructions
     */
    static dependencyNotFound(dependency: string): string {
        const platform = PlatformDetector.detectPlatform()
        let instructions = ''

        if (dependency === 'python' || dependency === 'python3') {
            if (platform === 'windows') {
                instructions = `
Install Python on Windows:
1. Download from: https://www.python.org/downloads/
2. Run installer and CHECK "Add Python to PATH"
3. Verify: python --version or python3 --version

Alternative:
- Install via Microsoft Store
- Install via Chocolatey: choco install python`
            } else if (platform === 'macos') {
                instructions = `
Install Python on macOS:
1. Via Homebrew (recommended):
   brew install python3

2. Download from python.org:
   https://www.python.org/downloads/macos/

Verify installation: python3 --version`
            } else {
                instructions = `
Install Python on Linux:
- Debian/Ubuntu: sudo apt install python3
- Fedora/RHEL: sudo dnf install python3
- Arch Linux: sudo pacman -S python

Verify installation: python3 --version`
            }
        } else if (dependency === 'go') {
            if (platform === 'windows') {
                instructions = `
Install Go on Windows:
1. Download from: https://go.dev/dl/
2. Run the MSI installer
3. Restart your terminal
4. Verify: go version

Alternative:
- Install via Chocolatey: choco install golang`
            } else if (platform === 'macos') {
                instructions = `
Install Go on macOS:
1. Via Homebrew (recommended):
   brew install go

2. Download from go.dev:
   https://go.dev/dl/

Verify installation: go version`
            } else {
                instructions = `
Install Go on Linux:
1. Download from: https://go.dev/dl/
2. Extract and install:
   sudo tar -C /usr/local -xzf go*.tar.gz
   export PATH=$PATH:/usr/local/go/bin

Alternative:
- Debian/Ubuntu: sudo apt install golang-go
- Fedora/RHEL: sudo dnf install golang
- Arch Linux: sudo pacman -S go

Verify installation: go version`
            }
        } else {
            instructions = `
'${dependency}' is not installed or not in PATH.

Installation steps:
1. Install ${dependency} using your system's package manager
2. Add ${dependency} to your PATH
3. Restart your terminal/IDE
4. Verify installation: ${dependency} --version`
        }

        return `❌ Missing Dependency: ${dependency}

${dependency} is required to run this test type but is not installed.
${instructions}`
    }

    /**
     * Creates a helpful error message when a library is not found during linking
     *
     * @param libraryName - Name of the missing library
     * @param compilerType - Type of compiler being used
     * @returns Formatted error message with resolution steps
     */
    static libraryNotFound(libraryName: string, compilerType?: string): string {
        return `❌ Library Not Found: ${libraryName}

The linker cannot find the library '${libraryName}'.

Common solutions:

1. Install the library development package:
   - Debian/Ubuntu: sudo apt install lib${libraryName}-dev
   - Fedora/RHEL: sudo dnf install ${libraryName}-devel
   - macOS Homebrew: brew install ${libraryName}
   - Windows: Download and install the library manually

2. Specify library search path in testme.json5:
   {
     compiler: {
       c: {
         flags: ['-L/path/to/library/directory']
       }
     }
   }

3. Use full path to library file:
   {
     compiler: {
       c: {
         libraries: ['/full/path/to/lib${libraryName}.a']
       }
     }
   }

4. Check library name is correct:
   - Library file: lib${libraryName}.so or lib${libraryName}.a
   - Link flag: -l${libraryName}
${compilerType ? `\nCompiler: ${compilerType}` : ''}

For more help, see: https://docs.embedthis.com/testme/libraries/`
    }
}
