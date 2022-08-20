/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import { diff, ReleaseType } from 'semver';
import { flags } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { parseJson } from '@salesforce/kit';
import { ensureString, isString } from '@salesforce/ts-types';
import { PackageJson } from './package';

type BumpType = Extract<ReleaseType, 'major' | 'minor' | 'patch'>;

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-release-management', 'dependabot.consolidate', ['maxVersionBump']);

const inclusionMap = {
  major: ['major', 'minor', 'patch'] as BumpType[],
  minor: ['minor', 'patch'] as BumpType[],
  patch: ['patch'] as BumpType[],
};

export const meetsVersionCriteria = (title: string, maxVersionBump: BumpType): boolean => {
  try {
    const versionsRegex = /[0-9]+.[0-9]+.[0-9]+/g;
    const [from, to] = title.match(versionsRegex);
    const bumpType = diff(from, to) as BumpType;
    return inclusionMap[maxVersionBump].includes(bumpType);
  } catch (e) {
    // example of unparsable title: https://github.com/salesforcecli/eslint-plugin-sf-plugin/pull/25
    return false;
  }
};

export const maxVersionBumpFlag = flags.enum({
  description: messages.getMessage('maxVersionBump'),
  char: 'm',
  options: ['major', 'minor', 'patch'],
  default: 'minor',
  required: true,
});

export const getOwnerAndRepo = async (
  ownerFlag: string,
  repoFlag: string
): Promise<{ owner: string; repo: string }> => {
  const fileData = await fs.promises.readFile('package.json', 'utf8');
  const pkgJson = parseJson(fileData, 'package.json', false) as PackageJson;
  if (pkgJson.repository && isString(pkgJson.repository)) {
    const [owner, repo] = pkgJson.repository?.split('/');
    return { owner, repo };
  } else {
    return {
      owner: ensureString(ownerFlag, 'You must specify an owner'),
      repo: ensureString(repoFlag, 'You must specify a repository'),
    };
  }
};
