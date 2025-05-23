/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import AWS from 'aws-sdk';
import { WebIdentityCredentials } from 'aws-sdk';
import { Agents } from 'got';

import { api } from './packAndSign.js';

import ClientConfiguration = WebIdentityCredentials.ClientConfiguration;

export async function putObject(bucket: string, key: string, body: string): Promise<AWS.S3.PutObjectOutput> {
  return new Promise((resolve, reject) => {
    const agent = api.getAgentForUri('https://s3.amazonaws.com') as Agents;
    const s3 = new AWS.S3({
      region: 'us-east-2', // Hardcoded for security and consistency
      httpOptions: { agent: agent.http },
      httpsOptions: { agent: agent.https },
    } as ClientConfiguration);
    s3.putObject(
      {
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: key.endsWith('.crt') ? 'application/x-x509-ca-cert' : 'application/octet-stream',
        CacheControl: 'public, max-age=31536000',
      },
      (err, resp) => {
        if (err) reject(err);
        if (resp) resolve(resp);
      }
    );
  });
}
