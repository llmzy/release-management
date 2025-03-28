/*
 * Copyright (c) 2020, salesforce.com, inc.
 * Modifications Copyright (c) 2025, Palomar Digital, LLC.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, camelcase*/
import { Octokit } from '@octokit/core';
import { Messages } from '@salesforce/core';
import { Env } from '@salesforce/kit';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { type AnyJson, ensureString } from '@salesforce/ts-types';

import { maxVersionBumpFlag, getOwnerAndRepo } from '../../dependabot.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

const messages = Messages.loadMessages('@llmzy/release-management', 'dependabot.automerge');
const messagesFromConsolidate = Messages.loadMessages('@llmzy/release-management', 'dependabot.consolidate');

type PullRequest = {
  state: string;
  title: string;
  user: {
    login: string;
  };
  html_url: string;
  number: number;
  head: {
    sha: string;
    ref: string;
  };
};

type octokitOpts = {
  owner: string;
  repo: string;
  pull_number: number;
  commit_title?: string;
  merge_method?: 'merge' | 'squash' | 'rebase';
};

export default class AutoMerge extends SfCommand<void> {
  public static readonly summary = messages.getMessage('description');
  public static readonly description = messages.getMessage('description');

  public static readonly examples = messages.getMessages('examples');

  public static readonly GITHUB_SERVICE_ACCOUNT = 'llmzy-cd';

  public static readonly flags = {
    owner: Flags.string({
      // eslint-disable-next-line sf-plugin/dash-o
      char: 'o',
      summary: messagesFromConsolidate.getMessage('owner'),
      dependsOn: ['repo'],
    }),
    repo: Flags.string({
      char: 'r',
      summary: messagesFromConsolidate.getMessage('repo'),
      dependsOn: ['owner'],
    }),
    'max-version-bump': maxVersionBumpFlag,
    dryrun: Flags.boolean({
      summary: messagesFromConsolidate.getMessage('dryrun'),
      char: 'd',
      default: false,
    }),
    'skip-ci': Flags.boolean({
      summary: messages.getMessage('flags.skip-ci.summary'),
      char: 's',
      default: false,
    }),
    'merge-method': Flags.string({
      summary: messages.getMessage('flags.merge-method.summary'),
      options: ['merge', 'squash', 'rebase'],
      default: 'merge',
    }),
  };

  // private props initialized early in run()
  private octokit!: Octokit;
  private baseRepoObject!: {
    owner: string;
    repo: string;
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(AutoMerge);
    const auth = ensureString(
      new Env().getString('GH_TOKEN') ?? new Env().getString('GITHUB_TOKEN'),
      'GH_TOKEN is required to be set in the environment'
    );
    this.baseRepoObject = await getOwnerAndRepo(flags.owner, flags.repo);
    this.octokit = new Octokit({ auth });

    this.log(`owner: ${this.baseRepoObject.owner}, scope: ${this.baseRepoObject.repo}`);
    const eligiblePRs = (
      await this.octokit.request('GET /repos/{owner}/{repo}/pulls', this.baseRepoObject)
    ).data.filter(
      (pr) =>
        pr.state === 'open' &&
        (pr.user?.login === 'dependabot[bot]' ||
          (pr.title.includes('refactor: devScripts update') && pr.user?.login === AutoMerge.GITHUB_SERVICE_ACCOUNT))
    ) as PullRequest[];
    const greenPRs = (await Promise.all(eligiblePRs.map((pr) => this.isGreen(pr)))).filter(isPrNotUndefined);
    const mergeablePRs = (await Promise.all(greenPRs.map((pr) => this.isMergeable(pr)))).filter(isPrNotUndefined);

    this.table({
      data: mergeablePRs.map((pr) => ({ 'Green, Mergeable PR': pr.title, Link: pr.html_url })),
    });
    this.log('');

    const prToMerge = mergeablePRs[0];

    if (!prToMerge) {
      this.log('No PRs can be automerged');
      this.log('\nPR Status Summary:');
      this.generatePRStatusTable(eligiblePRs, greenPRs, mergeablePRs);
      return;
    }

    if (flags.dryrun === false) {
      this.log(`merging ${prToMerge.number.toString()} | ${prToMerge.title}`);
      const opts: octokitOpts = {
        ...this.baseRepoObject,
        // TODO: make oclif smarter about options on flags
        merge_method: flags['merge-method'] as 'merge' | 'squash' | 'rebase',
        pull_number: prToMerge.number,
      };
      if (flags['skip-ci']) {
        opts.commit_title = `Merge pull request #${prToMerge.number} from ${prToMerge.head.ref} [skip ci]`;
      }
      const mergeResult = await this.octokit.request('PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge', opts);
      this.styledJSON(mergeResult as unknown as AnyJson);
    } else {
      this.log(`dry run ${prToMerge.number.toString()} | ${prToMerge.title}`);
    }
  }

  private async isGreen(pr: PullRequest): Promise<PullRequest | undefined> {
    try {
      await this.octokit.request('GET /repos/{owner}/{repo}/commits/{ref}/status', {
        ...this.baseRepoObject,
        ref: pr.head.sha,
      });

      const checkRunResponse = await this.octokit.request('GET /repos/{owner}/{repo}/commits/{ref}/check-runs', {
        ...this.baseRepoObject,
        ref: pr.head.sha,
      });

      // If all check runs are completed and successful/skipped, we consider it green
      if (
        checkRunResponse.data.check_runs.every(
          (cr) => cr.status === 'completed' && cr.conclusion && ['success', 'skipped'].includes(cr.conclusion)
        )
      ) {
        return pr;
      }
    } catch (error) {
      this.log(`Error checking PR ${pr.number} status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return undefined;
    }
  }

  private async isMergeable(pr: PullRequest): Promise<PullRequest | undefined> {
    const statusResponse = await this.octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
      ...this.baseRepoObject,
      pull_number: pr.number,
    });

    // mergeable_state of 'blocked' is ok because that's just missing an approval.
    // We're screening out 'behind' which might be merge conflicts.
    // Dependabot should rebase this PR eventually
    if (statusResponse.data.mergeable === true && statusResponse.data.mergeable_state !== 'behind') {
      return pr;
    }
  }

  private generatePRStatusTable(
    eligiblePRs: PullRequest[],
    greenPRs: PullRequest[],
    mergeablePRs: PullRequest[]
  ): void {
    const tableData = eligiblePRs.map((pr) => ({
      'PR Title': pr.title,
      Link: pr.html_url,
      Green: greenPRs.some((greenPR) => greenPR.number === pr.number) ? '✓' : '✗',
      Mergeable: mergeablePRs.some((mergeablePR) => mergeablePR.number === pr.number) ? '✓' : '✗',
    }));

    this.table({
      data: tableData,
    });
  }
}

const isPrNotUndefined = (pr: PullRequest | undefined): pr is PullRequest => pr !== undefined;
