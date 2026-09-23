#!/usr/bin/env node

// Prints the GitHub release notes for a version from CHANGELOG.md.
// A release candidate uses the section of the version it leads up to.

import fs from 'node:fs';
import process from 'node:process';

const version = process.argv[2];
const match = /^(\d+\.\d+\.\d+)(-rc\.\d+)?$/.exec(version || '');

if (!match) {
  console.error('Usage: node tools/release-notes.mjs <version>');
  console.error('Version must look like 1.2.3 or 1.2.3-rc.1.');
  process.exit(1);
}

const [, target, candidate] = match;
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const lines = changelog.split('\n');
const start = lines.findIndex(line => line.trim() === `## ${target}`);

if (start === -1) {
  console.error(`CHANGELOG.md has no "## ${target}" section. Add it before releasing ${version}.`);
  process.exit(1);
}

let end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
if (end === -1) end = lines.length;
const repository = 'https://github.com/tobayashi-san/Fleet/blob/main/';
// Release pages resolve relative links against the release, not the repository.
const body = lines.slice(start + 1, end).join('\n').trim()
  .replace(/\]\((?![a-z]+:|#)([^)]+)\)/g, (_, link) => `](${repository}${link})`);

if (!body) {
  console.error(`The "## ${target}" section in CHANGELOG.md is empty.`);
  process.exit(1);
}

const image = 'ghcr.io/tobayashi-san/fleet';
const notes = [
  candidate
    ? `> [!WARNING]\n> Release candidate for Fleet ${target}. Use it for testing only; it does not replace \`latest\`.`
    : null,
  body,
  '## Install or upgrade',
  `Back up first, then pull \`${image}:${version}\`. See the [upgrade and support policy](${repository}docs/UPGRADE_POLICY.md) for tags, supported upgrade paths and [image verification](${repository}docs/UPGRADE_POLICY.md#verifying-images).`,
].filter(Boolean);

process.stdout.write(`${notes.join('\n\n')}\n`);
