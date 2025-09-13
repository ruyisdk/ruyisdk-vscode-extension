# Detect Command
Checks whether the `ruyi` CLI is available and reports its version.  
On failure, the user can jump to the official installation guide.

## Responsibilities
- Execute `ruyi --version`.
- Show success/failure messages to the user.
- Offer an "Open installation guide" action when `ruyi` is missing.

## Behavior
- Success (code = 0): show `ruyi` version from `stdout`.
- Not found (code = -127): prompt to open the official installation guide.
- Not supported (code = -126): returned when the current platform is not Linux. The Ruyi SDK extension only supports Linux at the moment.
- Other non-zero: show a generic failure message and ask the user to check output.

## Error Codes
These are standardized by `exec` utilities:
- `0` – success
- `-126` – platform not supported
- `-127` – `ruyi` binary not found
- other non-zero – execution failed (see `stderr`)

## API surface
### Command Usage
```ts
type Options = { silent?: boolean }
```
When invoked from the Command Palette: no arguments are passed (`silent` defaults to `false`), and the user always sees a pop-up message with the result.
When invoked programmatically with `{ silent: true }`: used for background checks (e.g. on activation). In this mode, success is silent, and only serious errors or missing `ruyi` trigger a pop-up.

#### Example
```ts
// Run detection silently during extension activation.
// Suppresses pop-ups on success, but still notifies on failure.
await vscode.commands.executeCommand('ruyi.detect', { silent: true });
```

### User flow (Palette)
1. User runs “Ruyi: Detect”.
2. Extension runs `ruyi --version` and shows:
   * Version on success; or
   * Install prompt with a link to the official download page on not found.

## Links
* Official download page: [https://ruyisdk.org/en/download/](https://ruyisdk.org/en/download/)

