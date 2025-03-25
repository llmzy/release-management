/*
 * Copyright (c) 2020, salesforce.com, inc.
 * Modifications Copyright (c) 2025, Palomar Digital, LLC.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

const path = require('path');

// Helper function to strip test/ prefix from paths since the test paths
// are relative to the test/.eslintrc.cjs file location, not the root of the project
function stripTestPrefix(filePath) {
  return filePath.replace(/^test\//, '');
}

// Load file lists and convert to relative paths
const modifiedFiles = require('./modified-files.json').map(stripTestPrefix);
const originalFiles = require('./original-files.json').map(stripTestPrefix);

// Header rule for original Salesforce files (unmodified)
const originalHeader = [
  2,
  'block',
  [
    '',
    {
      pattern: ' \\* Copyright \\(c\\) \\d{4}, salesforce\\.com, inc\\.',
      template: ' * Copyright (c) 2020, salesforce.com, inc.',
    },
    ' * All rights reserved.',
    ' * Licensed under the BSD 3-Clause license.',
    ' * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause',
    ' ',
  ],
];

// Header rule for modified files (dual copyright)
const modifiedHeader = [
  2,
  'block',
  [
    '',
    {
      pattern: ' \\* Copyright \\(c\\) \\d{4}, salesforce\\.com, inc\\.',
      template: ' * Copyright (c) 2020, salesforce.com, inc.',
    },
    ' * Modifications Copyright (c) 2025, Palomar Digital, LLC.',
    ' * All rights reserved.',
    ' * Licensed under the BSD 3-Clause license.',
    ' * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause',
    ' ',
  ],
];

// Header rule for new files (Palomar Digital only) - now the default
const palomarHeader = [
  2,
  'block',
  [
    '',
    ' * Copyright (c) 2025, Palomar Digital, LLC.',
    ' * All rights reserved.',
    ' * Licensed under the BSD 3-Clause license.',
    ' * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause',
    ' ',
  ],
];

module.exports = {
  plugins: ['header'],
  rules: {
    'header/header': palomarHeader,
  },
  overrides: [
    {
      files: modifiedFiles,
      rules: {
        'header/header': modifiedHeader,
      },
    },
    {
      files: originalFiles,
      rules: {
        'header/header': originalHeader,
      },
    },
  ],
};
