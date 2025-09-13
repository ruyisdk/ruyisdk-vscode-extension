# `ruyi.install` Command
## Description
The `ruyi.install` command installs the RuyiSDK package manager using PyPI.

## Workflow
1. Platform check
Supported only on Linux currently.

2. Python check
Verifies whether Python ≥ 3.8 is available by running `python3 --version`.
If Python is not found, the user is prompted to install Python first.

3. Installation
Executes the following command to install or upgrade Ruyi:
```bash
pip3 install -U ruyi
```

4. Verification
Runs `ruyi --version` to confirm the installation.
If successful, the installed version is displayed.
If unsuccessful, a warning is shown, asking the user to check their `PATH` configuration.

## Usage
Open the VS Code Command Palette and run:
```
Ruyi: Install 
```

### Example Output
* Successful installation
```
Ruyi installation completed.
Ruyi installed: ruyi v0.39.0
```

* Python not found
```
Python (>=3.8) not detected. Please install Python first, then rerun this command.
```

* Verification failed
```
Installation finished, but Ruyi was not detected. Please check your PATH.
```
