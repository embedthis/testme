# Health Check Feature Plan

**Date**: 2025-10-21
**Status**: Proposed
**Priority**: Medium

## Problem Statement

Currently, TestMe uses an arbitrary `setupDelay` (default 1 second) to wait after starting a setup service before running tests. This causes two problems:

1. **Too short**: Services may not be ready, causing flaky tests
2. **Too long**: Tests wait unnecessarily when service is already ready, slowing down test execution

## Proposed Solution

Implement a flexible health check system that actively monitors service readiness and starts tests as soon as the service is confirmed healthy.

## Design Overview

### Configuration Structure

```json5
{
    services: {
        setup: "docker-compose up -d",
        healthCheck: {
            type: "http",           // Type: http | tcp | script | file (default: http)
            interval: 100,          // Poll interval in ms (default: 100)
            timeout: 30,            // Max wait time in seconds (default: 30)
            // Type-specific fields below
        },
        setupDelay: 1               // Fallback if no healthCheck specified
    }
}
```

**Note**: The `type` field defaults to `"http"` if not specified. This allows the simplest configuration to just specify a URL:

```json5
healthCheck: {
    url: "http://localhost:8080/health"  // type defaults to "http"
}
```

### Health Check Types

#### 1. HTTP/HTTPS Health Check (Priority: High)

**Use Case**: Web servers, REST APIs, databases with HTTP interfaces

```json5
healthCheck: {
    type: "http",
    url: "http://localhost:8080/health",
    expectedStatus: 200,          // Optional, default: 200
    expectedBody: "OK",           // Optional: substring match in response body
    interval: 100,
    timeout: 30
}
```

**Implementation Notes**:
- Use `fetch()` API available in Bun runtime
- Support both HTTP and HTTPS
- Handle redirects appropriately
- Return healthy when: status matches AND (if specified) body contains expectedBody
- Log failed attempts in verbose mode

#### 2. TCP Port Check (Priority: High)

**Use Case**: Databases (PostgreSQL, MySQL, Redis), message brokers, any TCP service

```json5
healthCheck: {
    type: "tcp",
    host: "localhost",
    port: 6379,
    interval: 100,
    timeout: 30
}
```

**Implementation Notes**:
- Attempt TCP connection to host:port
- Return healthy if connection succeeds (even if immediately closed)
- Use Bun's `Bun.connect()` or Node.js net module
- Fast and lightweight

#### 3. Script-Based Health Check (Priority: Medium)

**Use Case**: Custom health checks using existing tools (pg_isready, redis-cli ping, curl, etc.)

```json5
healthCheck: {
    type: "script",
    command: "pg_isready -h localhost -p 5432",
    expectedExit: 0,              // Optional, default: 0
    interval: 100,
    timeout: 30
}
```

**Implementation Notes**:
- Execute command using `Bun.spawn()`
- Return healthy when exit code matches expectedExit
- Capture stdout/stderr for verbose logging
- Platform-specific: document that commands should be portable

**Common Examples**:
- PostgreSQL: `pg_isready -h localhost`
- MySQL: `mysqladmin ping -h localhost`
- Redis: `redis-cli ping`
- Custom: `curl -f http://localhost:8080/health`

#### 4. File/Socket Existence Check (Priority: Low)

**Use Case**: Unix domain sockets, ready files written by service

```json5
healthCheck: {
    type: "file",
    path: "/tmp/daemon.ready",    // or /var/run/daemon.sock
    interval: 100,
    timeout: 30
}
```

**Implementation Notes**:
- Check if file/socket exists using `Bun.file().exists()` or filesystem stat
- Return healthy when path exists and is readable
- Useful for services that create ready markers

## Type System Updates

```typescript
// src/types.ts

type HttpHealthCheck = {
    type: 'http';
    url: string;
    expectedStatus?: number;
    expectedBody?: string;
    interval?: number;
    timeout?: number;
};

type TcpHealthCheck = {
    type: 'tcp';
    host: string;
    port: number;
    interval?: number;
    timeout?: number;
};

type ScriptHealthCheck = {
    type: 'script';
    command: string;
    expectedExit?: number;
    interval?: number;
    timeout?: number;
};

type FileHealthCheck = {
    type: 'file';
    path: string;
    interval?: number;
    timeout?: number;
};

export type HealthCheckConfig =
    | HttpHealthCheck
    | TcpHealthCheck
    | ScriptHealthCheck
    | FileHealthCheck;

export type ServiceConfig = {
    skip?: string;
    environment?: string;
    globalPrep?: string;
    prep?: string;
    setup?: string;
    cleanup?: string;
    globalCleanup?: string;
    healthCheck?: HealthCheckConfig;  // NEW
    // ... existing timeout fields
    setupDelay?: number;  // Fallback if no healthCheck
    shutdownTimeout?: number;
};
```

## Implementation Plan

### Phase 1: Core Health Checks (Implement First)

1. **Create HealthCheckManager** (`src/services/health-check.ts`)
   - Interface for all health check types
   - Polling loop with configurable interval
   - Timeout handling
   - Error logging

2. **Implement HTTP Health Check**
   - Use `fetch()` API
   - Status code validation
   - Optional body substring matching
   - Handle network errors gracefully

3. **Implement TCP Health Check**
   - TCP connection attempt
   - Quick connect/disconnect test
   - Platform-agnostic (Bun.connect or net module)

4. **Update ServiceManager** (`src/services.ts`)
   - After starting setup process, check if `healthCheck` configured
   - If yes: run health check polling loop
   - If no: fall back to `setupDelay` (or default 1s)
   - Log health check attempts in verbose mode

5. **Update Configuration System** (`src/config.ts`)
   - Add `healthCheck` to `DEFAULT_CONFIG.services`
   - Validation for health check configuration
   - Type checking for discriminated union

### Phase 2: Advanced Health Checks (Implement Later)

6. **Implement Script-Based Health Check**
   - Execute command using Bun.spawn()
   - Exit code validation
   - Capture output for logging

7. **Implement File Health Check**
   - File existence check
   - Socket detection
   - Path resolution

### Phase 3: Documentation and Testing

8. **Documentation Updates**
   - README.md: Add health check section with examples
   - CLAUDE.md: Update service lifecycle documentation
   - Man page: Document health check configuration
   - doc/testme.json5: Add example configurations

9. **Unit Tests**
   - Mock HTTP server that becomes healthy after delay
   - TCP server test
   - Script-based test (simple shell script)
   - Timeout scenarios
   - Fallback to setupDelay behavior

10. **Integration Tests**
    - Real-world scenarios: docker-compose, simple HTTP server
    - Test fast startup (health check faster than setupDelay)
    - Test slow startup (health check prevents premature test execution)

## Execution Flow

### Current Flow (with setupDelay):
```
1. Start setup service
2. Wait setupDelay seconds (blind wait)
3. Run tests
```

### New Flow (with healthCheck):
```
1. Start setup service
2. If healthCheck configured:
   a. Start polling at interval
   b. Check health using configured method
   c. If healthy: proceed to tests
   d. If timeout reached: error with clear message
   e. If check fails: retry until timeout
3. Else if setupDelay configured:
   a. Wait setupDelay seconds (backward compatible)
4. Else:
   a. Wait default 1 second (backward compatible)
5. Run tests
```

## Configuration Examples

### Example 1: Web Server
```json5
{
    services: {
        setup: "npm start",
        healthCheck: {
            type: "http",
            url: "http://localhost:3000/health",
            timeout: 30
        }
    }
}
```

### Example 2: PostgreSQL Database
```json5
{
    services: {
        setup: "docker run -d -p 5432:5432 postgres",
        healthCheck: {
            type: "tcp",
            host: "localhost",
            port: 5432,
            timeout: 60
        }
    }
}
```

### Example 3: Redis with Script Check
```json5
{
    services: {
        setup: "redis-server --daemonize yes",
        healthCheck: {
            type: "script",
            command: "redis-cli ping",
            timeout: 10
        }
    }
}
```

### Example 4: Custom Service with Ready File
```json5
{
    services: {
        setup: "./start-daemon.sh",
        healthCheck: {
            type: "file",
            path: "/tmp/daemon.ready",
            timeout: 30
        }
    }
}
```

## Benefits

1. **Faster Test Execution**: Tests start immediately when service is ready (no unnecessary waiting)
2. **More Reliable Tests**: No more flaky tests due to services not being ready
3. **Flexible**: Supports many different service types and health check methods
4. **Backward Compatible**: Falls back to `setupDelay` if no health check configured
5. **Better Developer Experience**: Clear error messages when services fail to start
6. **Industry Standard**: Follows patterns from Docker, Kubernetes, etc.

## Edge Cases to Handle

1. **Service never becomes healthy**
   - Timeout with clear error message
   - Show last health check failure details
   - Exit with non-zero code (abort tests)

2. **Health check itself fails**
   - Network errors, DNS failures, etc.
   - Retry until timeout
   - Log failures in verbose mode

3. **Service becomes healthy then fails**
   - Consider: re-check health before each test?
   - Or: trust that service stays healthy once confirmed?
   - Recommendation: Only check once at startup (simpler)

4. **Multiple services in setup**
   - Current setup is single command
   - If needed, user can write script that starts multiple services
   - Health check validates final ready state

5. **Platform-specific health checks**
   - Script-based checks may not be portable
   - Document platform considerations
   - Recommend TCP/HTTP for cross-platform compatibility

## Performance Considerations

- Default 100ms polling interval balances responsiveness vs CPU usage
- HTTP health checks may be slower than TCP (full request/response)
- Script-based checks spawn processes repeatedly (most expensive)
- File checks are fastest but least common

## Backward Compatibility

- `setupDelay` still supported and used when `healthCheck` not specified
- Default behavior unchanged (1 second delay)
- Existing configurations work without modification
- `healthCheck` is purely additive

## Future Enhancements (Out of Scope)

- Continuous health monitoring during test execution
- Multiple health checks (AND/OR logic)
- Retry with backoff strategy
- Health check metrics/timing in output
- Pre-flight health check (verify before starting setup)

## Success Criteria

1. HTTP and TCP health checks working for common services
2. Tests start faster when services are quick to start
3. Tests wait appropriately when services are slow to start
4. Clear error messages when services fail to start
5. All existing tests pass (backward compatibility)
6. Comprehensive documentation with examples
7. New test suite validates health check functionality

## Estimated Effort

- **Phase 1** (HTTP + TCP): 4-6 hours
  - HealthCheckManager: 2 hours
  - HTTP implementation: 1 hour
  - TCP implementation: 1 hour
  - ServiceManager integration: 1 hour
  - Configuration updates: 1 hour

- **Phase 2** (Script + File): 2-3 hours
  - Script implementation: 1 hour
  - File implementation: 0.5 hours
  - Additional testing: 1.5 hours

- **Phase 3** (Documentation + Tests): 3-4 hours
  - Documentation: 2 hours
  - Unit tests: 1 hour
  - Integration tests: 1 hour

**Total Estimated Effort**: 9-13 hours

## Recommendation

Implement **Phase 1** (HTTP + TCP) first as these cover 90% of real-world use cases. Script-based and file-based checks (Phase 2) can be added later if there's demand.

Start with HTTP health check as the most common scenario, then add TCP support for databases and other network services.
