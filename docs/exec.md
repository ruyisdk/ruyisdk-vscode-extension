# Exec Utilities
This module wraps execution of the `ruyi` CLI.

## Responsibilities
- Resolve the path of `ruyi` executable.
- Execute `ruyi` commands via `child_process.exec`.
- Standardize return codes for upper-level commands.

## Error Codes
- `0` – success
- `-126` – platform not supported (non-Linux)
- `-127` – `ruyi` binary not found
- others – process failed, see `stderr`

## API
### `ExecResult`
```ts
interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}
```
Represents the result of running a ruyi command:
code: normalized exit code (0 = success, -126 = not supported, -127 = not found, others = failure).
stdout: captured standard output as a string.
stderr: captured standard error as a string.

### `resolveRuyiPath(): string | null`
Resolve the path of the `ruyi` executable by searching the system `PATH`.  
Returns the first match if found, otherwise `null`.

### `runRuyi(args: string[], cwd?: string): Promise<ExecResult>`
Execute `ruyi` with arguments. Returns exit code, stdout, stderr.

