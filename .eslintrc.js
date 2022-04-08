module.exports = {
    "env": {
      'commonjs': true,
      'es2021': true,
      'node': true,
    },
    "extends": "eslint:recommended",
    "parserOptions": {
      "ecmaVersion": 12
    },
    'rules': {
      'linebreak-style': [
          'error',
          'unix'
      ],
      'no-unused-vars': [
        "warn", 
        { "args": "none" }
      ],
      'semi': [
          'warn',
          'always'
      ]
    }
};
