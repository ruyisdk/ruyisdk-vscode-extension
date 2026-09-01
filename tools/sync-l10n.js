#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { execSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const EN_FILE = path.join(ROOT_DIR, 'l10n', 'bundle.l10n.json');
const ZH_FILE = path.join(ROOT_DIR, 'l10n', 'bundle.l10n.zh-cn.json');
const CHECK_MODE_FLAGS = new Set(['--check', '--compare-only', '--no-prompt']);

const ANSI = {
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  cyan: '\u001b[36m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  red: '\u001b[31m',
  magenta: '\u001b[35m',
};

function style(text, color, bold = false) {
  if (!process.stdout.isTTY) {
    return text;
  }

  return `${bold ? ANSI.bold : ''}${color}${text}${ANSI.reset}`;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt, defaultValue) {
  return new Promise((resolve) => {
    const suffix = defaultValue !== undefined ? ` [${defaultValue}]` : '';
    const styledPrompt = style(prompt, ANSI.yellow, true);
    rl.question(`${styledPrompt}${suffix}: `, (answer) => {
      const value = answer.trim();
      resolve(value === '' ? defaultValue : value);
    });
  });
}

function askYesNo(prompt, defaultValue = false) {
  return question(prompt, defaultValue ? 'y' : 'n').then((answer) => {
    const normalized = String(answer).trim().toLowerCase();
    if (normalized === '' || normalized === 'n' || normalized === 'no') {
      return false;
    }
    if (normalized === 'y' || normalized === 'yes') {
      return true;
    }
    console.log('Please answer yes (y) or no (n).');
    return askYesNo(prompt, defaultValue);
  });
}

function refreshL10nBundle() {
  const command = 'npx @vscode/l10n-dev export --outDir ./l10n ./src';

  console.log(`\n${style('=== Refreshing l10n bundle ===', ANSI.cyan, true)}`);
  console.log(`${style('Command:', ANSI.cyan, true)} ${style(command, ANSI.magenta)}`);

  execSync(command, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: process.env,
  });
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function compareEntries(defaultEntries, localizedEntries) {
  const defaultKeys = Object.keys(defaultEntries);
  const localizedKeys = Object.keys(localizedEntries);

  const missingInLocalized = defaultKeys
    .filter((key) => !(key in localizedEntries))
    .sort();

  const extraInLocalized = localizedKeys
    .filter((key) => !(key in defaultEntries))
    .sort();

  return {
    totalDefault: defaultKeys.length,
    totalLocalized: localizedKeys.length,
    missingInLocalized,
    extraInLocalized,
  };
}

function printList(title, entries, valueMap) {
  const titleColor = title.toLowerCase().includes('missing') ? ANSI.red : ANSI.magenta;
  console.log(`\n${style(title, titleColor, true)} (${entries.length})`);

  if (entries.length === 0) {
    console.log(`  ${style('None', ANSI.green)}`);
    return;
  }

  for (const key of entries) {
    console.log(`  ${style('- ' + key, titleColor)}`);

    const value = valueMap[key];
    if (value !== undefined) {
      console.log(`      ${style(String(value).replace(/\n/g, '\\n'), ANSI.yellow)}`);
    }
  }
}

function buildAlignedEntries(defaultEntries, localizedEntries, missingValues) {
  const aligned = {};

  for (const key of Object.keys(defaultEntries)) {
    if (key in localizedEntries) {
      aligned[key] = localizedEntries[key];
    } else if (key in missingValues) {
      aligned[key] = missingValues[key];
    } else {
      aligned[key] = defaultEntries[key];
    }
  }

  return aligned;
}

async function main() {
  refreshL10nBundle();

  const defaultEntries = readJson(EN_FILE);
  const localizedEntries = readJson(ZH_FILE);
  const diff = compareEntries(defaultEntries, localizedEntries);

  console.log(`\n${style('=== Localization comparison ===', ANSI.cyan, true)}`);
  console.log(`${style('Base file:', ANSI.cyan, true)} ${style(EN_FILE, ANSI.magenta)}`);
  console.log(`${style('Localized file:', ANSI.cyan, true)} ${style(ZH_FILE, ANSI.magenta)}`);
  console.log(`${style('Total keys in base:', ANSI.cyan, true)} ${style(String(diff.totalDefault), ANSI.green, true)}`);
  console.log(`${style('Total keys in localized:', ANSI.cyan, true)} ${style(String(diff.totalLocalized), ANSI.green, true)}`);

  printList('Missing in zh-cn (to add)', diff.missingInLocalized, defaultEntries);
  printList('Extra in zh-cn (to remove)', diff.extraInLocalized, localizedEntries);

  const hasDifference = diff.missingInLocalized.length > 0 || diff.extraInLocalized.length > 0;
  if (!hasDifference) {
    console.log(`\n${style('Status:', ANSI.cyan, true)} ${style('All keys are synchronized.', ANSI.green, true)}`);
    rl.close();
    return;
  }

  if (process.argv.includes('--check') || process.argv.includes('--compare-only') || process.argv.includes('--no-prompt')) {
    console.log(`\n${style('Status:', ANSI.cyan, true)} ${style('Locale files are not aligned.', ANSI.red, true)}`);
    console.log(`${style('Exit code:', ANSI.cyan, true)} ${style('1', ANSI.red, true)}`);
    rl.close();
    process.exit(1);
  }

  console.log(`\n${style('This script will align the localized file to the base file.', ANSI.yellow, true)}`);

  let nextLocalizedEntries = { ...localizedEntries };

  if (diff.extraInLocalized.length > 0) {
    const shouldDelete = await askYesNo('Delete extra entries from zh-cn file?', false);
    if (shouldDelete) {
      for (const key of diff.extraInLocalized) {
        delete nextLocalizedEntries[key];
      }
      console.log(`${style('Deleted:', ANSI.red, true)} ${style(String(diff.extraInLocalized.length), ANSI.green, true)} extra entry/entries.`);
    } else {
      console.log(`${style('Kept extra entries without deleting them.', ANSI.yellow, true)}`);
    }
  }

  const missingValues = {};
  if (diff.missingInLocalized.length > 0) {
    console.log(`\n${style('Please provide the value for each missing key. Press Enter to use the English text as a fallback.', ANSI.yellow, true)}`);
    for (const key of diff.missingInLocalized) {
      const defaultValue = defaultEntries[key];
      const answer = await question(`Missing key: ${key}\n  English: ${String(defaultValue).replace(/\n/g, '\\n')}`, String(defaultValue));
      missingValues[key] = answer;
      nextLocalizedEntries[key] = answer;
    }
  }

  const alignedEntries = buildAlignedEntries(defaultEntries, nextLocalizedEntries, missingValues);
  const json = `${JSON.stringify(alignedEntries, null, 2)}\n`;
  fs.writeFileSync(ZH_FILE, json, 'utf8');

  console.log(`\n${style('Aligned file written successfully.', ANSI.green, true)}`);
  console.log(`${style('Updated file:', ANSI.cyan, true)} ${style(ZH_FILE, ANSI.magenta)}`);

  const nextDiff = compareEntries(defaultEntries, readJson(ZH_FILE));
  console.log(`${style('Missing after alignment:', ANSI.cyan, true)} ${style(String(nextDiff.missingInLocalized.length), ANSI.red, true)}`);
  console.log(`${style('Extra after alignment:', ANSI.cyan, true)} ${style(String(nextDiff.extraInLocalized.length), ANSI.magenta, true)}`);

  rl.close();
}

main().catch(error => {
  console.error('Failed to align localization files:');
  console.error(error instanceof Error ? error.message : String(error));
  rl.close();
  process.exit(1);
});
