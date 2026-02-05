module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Code style (formatting, missing semicolons, etc.)
        'refactor', // Code refactoring
        'perf',     // Performance improvement
        'test',     // Adding tests
        'build',    // Build system or external dependencies
        'ci',       // CI configuration
        'chore',    // Other changes
        'revert',   // Revert previous commit
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 100],
  },
};
