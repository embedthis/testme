# Plan: Generate Visual Studio Project for --debug on Windows

**Status**: ✅ COMPLETED (2025-12-10)
**Implemented in**: v0.8.32

## Problem

The current `--debug` implementation on Windows uses `devenv /UseEnv /DebugExe <binary>`, but:
- `/UseEnv` only affects compilation environment, not debugger environment
- DLLs fail to load because PATH isn't available to the debugger
- Manually setting PATH in VS solution properties works

## Solution

Generate `.vcxproj` and `.vcxproj.user` files directly (no external tool needed), similar to how xcodegen YAML is generated for Xcode.

### Key Finding: Solution file NOT required

Visual Studio can open a `.vcxproj` file directly - it creates a temporary solution wrapper automatically. This simplifies our implementation.

## Files to Generate

### 1. `<testname>.vcxproj` - Project file
```xml
<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" ToolsVersion="Current" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemGroup Label="ProjectConfigurations">
    <ProjectConfiguration Include="Debug|x64">
      <Configuration>Debug</Configuration>
      <Platform>x64</Platform>
    </ProjectConfiguration>
  </ItemGroup>
  <PropertyGroup Label="Globals">
    <ProjectGuid>{GUID}</ProjectGuid>
    <RootNamespace>testname</RootNamespace>
  </PropertyGroup>
  <Import Project="$(VCTargetsPath)\Microsoft.Cpp.default.props" />
  <PropertyGroup Label="Configuration">
    <ConfigurationType>Application</ConfigurationType>
    <PlatformToolset>v143</PlatformToolset>
  </PropertyGroup>
  <Import Project="$(VCTargetsPath)\Microsoft.Cpp.props" />
  <ItemDefinitionGroup>
    <ClCompile>
      <AdditionalIncludeDirectories>...</AdditionalIncludeDirectories>
      <Optimization>Disabled</Optimization>
      <DebugInformationFormat>ProgramDatabase</DebugInformationFormat>
    </ClCompile>
    <Link>
      <AdditionalLibraryDirectories>...</AdditionalLibraryDirectories>
      <AdditionalDependencies>...</AdditionalDependencies>
      <GenerateDebugInformation>true</GenerateDebugInformation>
    </Link>
  </ItemDefinitionGroup>
  <ItemGroup>
    <ClCompile Include="..\..\testname.tst.c" />
  </ItemGroup>
  <Import Project="$(VCTargetsPath)\Microsoft.Cpp.targets" />
</Project>
```

### 2. `<testname>.vcxproj.user` - Debug settings with environment
```xml
<?xml version="1.0" encoding="utf-8"?>
<Project ToolsVersion="Current" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup Condition="'$(Configuration)|$(Platform)'=='Debug|x64'">
    <LocalDebuggerWorkingDirectory>C:\path\to\test</LocalDebuggerWorkingDirectory>
    <LocalDebuggerEnvironment>PATH=C:\path\to\dlls;$(PATH)
TESTME_VERBOSE=1
TESTME_PLATFORM=windows-x64</LocalDebuggerEnvironment>
    <DebuggerFlavor>WindowsLocalDebugger</DebuggerFlavor>
  </PropertyGroup>
</Project>
```

## Implementation Steps

### Step 1: Add VS project generation method to `artifacts.ts` ✅

Add new method `generateVisualStudioProject()` that:
- Takes same parameters as `generateXcodeProjectConfig()`: testFile, expandedFlags, expandedLibraries, config, compiler
- Returns object with `{ vcxproj: string, vcxprojUser: string }`
- Translates compiler flags to MSVC equivalents:
  - `-I` → `<AdditionalIncludeDirectories>`
  - `-L` → `<AdditionalLibraryDirectories>`
  - Libraries → `<AdditionalDependencies>`
- Builds environment variables same as Xcode (TESTME_*, user-defined)
- Uses newline-separated `KEY=VALUE` format for `LocalDebuggerEnvironment`

### Step 2: Add `createVisualStudioProject()` method to `artifacts.ts` ✅

Add new method that:
- Calls `generateVisualStudioProject()` to get XML content
- Writes `<testname>.vcxproj` to artifact directory
- Writes `<testname>.vcxproj.user` to artifact directory
- Returns path to .vcxproj file

### Step 3: Modify `launchVisualStudioDebugger()` in `handlers/c.ts` ✅

Changed from:
```typescript
Bun.spawn([devenvPath, '/UseEnv', binaryPath], ...)
```

To:
```typescript
// Generate project files
await this.artifactManager.createVisualStudioProject(file, expandedFlags, expandedLibraries, config, compiler)
const projectPath = join(file.artifactDir, `${testBaseName}.vcxproj`)

// Open project in VS
Bun.spawn([devenvPath, projectPath], ...)
```

### Step 4: Remove `/UseEnv` flag ✅

Since it doesn't work for debugging, removed it from the devenv command.

## Additional Fixes (December 10, 2025)

During testing on Windows ARM64, three additional issues were discovered and fixed:

### Fix 1: Special Variable Expansion ✅
- `${PLATFORM}`, `${PROFILE}`, `${ARCH}` were not being expanded in PATH
- Fixed by passing `specialVars` to `GlobExpansion.expandSingle()` in both Xcode and VS project generation

### Fix 2: ARM64 Platform Detection ✅
- VS projects were hardcoded to `x64`
- Bun reports `process.arch` as `x64` on ARM64 due to emulation
- Fixed by using `PROCESSOR_IDENTIFIER` environment variable to detect ARM64

### Fix 3: Library Name Preservation ✅
- Library names like `libwebsock` were incorrectly stripped to `websock.lib`
- Fixed by preserving library names as-is and only adding `.lib` suffix

## Files Modified

| File | Changes |
|------|---------|
| `/Users/mob/c/testme/src/artifacts.ts` | Add `generateVisualStudioProject()`, `createVisualStudioProject()`, ARM64 detection, library name fix |
| `/Users/mob/c/testme/src/handlers/c.ts` | Modify `launchVisualStudioDebugger()` to generate and open project |

## Compiler Flag Mapping

| GCC/Clang | MSVC vcxproj |
|-----------|--------------|
| `-I<path>` | `<AdditionalIncludeDirectories>` |
| `-L<path>` | `<AdditionalLibraryDirectories>` |
| `-l<lib>` | `<AdditionalDependencies>lib.lib</AdditionalDependencies>` |
| `-Wall` | `<WarningLevel>Level4</WarningLevel>` |
| `-g` | `<DebugInformationFormat>ProgramDatabase</DebugInformationFormat>` |
| `-O0` | `<Optimization>Disabled</Optimization>` |

## Environment Variable Format

The `LocalDebuggerEnvironment` uses newline-separated `KEY=VALUE` pairs:
```
PATH=C:\path1;C:\path2;$(PATH)
TESTME_VERBOSE=1
MY_VAR=value
```

## Testing

1. On Windows with MSVC, run `tm --debug test.tst.c` ✅
2. Verify `.vcxproj` and `.vcxproj.user` files are generated in `.testme/<testname>/` ✅
3. Verify VS opens with the project ✅
4. Verify environment variables are visible in Debug → Properties ✅
5. Verify DLLs load correctly when debugging ✅

## Notes

- No solution file needed - VS creates a temporary wrapper
- Platform toolset defaults to v143 (VS 2022), but could be made configurable
- Architecture dynamically detected: ARM64, x64, or Win32

## Sources

- [.vcxproj file structure | Microsoft Learn](https://learn.microsoft.com/en-us/cpp/build/reference/vcxproj-file-structure)
- [FASTBuild VCXProject reference](https://www.fastbuild.org/docs/functions/vcxproject.html)
- [Premake](https://premake.github.io/)
