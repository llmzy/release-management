/*
 * Copyright (c) 2020, salesforce.com, inc.
 *
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

module.exports = {
  extends: ['eslint-config-salesforce-typescript', 'plugin:sf-plugin/recommended', './eslint-rules/headers.cjs'],
  rules: {
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': ['error'],
  },
};
