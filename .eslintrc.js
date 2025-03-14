module.exports = {
    root: true,
    ignorePatterns: ["**/gql-schema/*", "es-lint-ts", "codegen.ts"],
    env: { browser: true, es2020: true },
    extends: ['airbnb', 'airbnb-typescript', 'prettier'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: true,
        tsconfigRootDir: __dirname,
    },
    plugins: ['prettier'],
    settings: {
        'import/core-modules': ['express','async-lock'], // inform that listed modules have been installed
    },
    rules: {
        '@typescript-eslint/no-non-null-assertion': 'off',
        'prettier/prettier': 'error',
        'import/extensions': [
            'error',
            'ignorePackages',
            {
                js: 'never',
                ts: 'never',
            },
        ],
        'import/prefer-default-export': 'off',
        'arrow-body-style': 'off',
        'no-plusplus': 'off',
        'class-methods-use-this': 'off',
    },
    overrides: [
        {
            'files': ['*.spec.ts'],
            'rules': {
                '@typescript-eslint/dot-notation': 'off'
            }
        }
    ],
};
