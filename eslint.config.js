const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
    {
    //excludes dependenies, coverage outputs, build artifacts, etc
        ignores: [
            "node_modules/**",
            "coverage/**",
            "artifacts/**",
            "test-results/**"
        ]
    },

    //base recommended rules
    js.configs.recommended,

    //configuration files use CommonJS
    {
        files: [
            "eslint.config.js",
            "jest.config.js"
        ],

        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",

            globals: {
                ...globals.node //exposes node global objects
            }
        },

        rules: {
            "no-undef": "error",
            "no-unused-vars": "error",
            "no-console": "off"
        }
    },

    //code of application to be checked
    {
        files: [
            "app.js",
            "server.js",
            "config/**/*.js",
            "controllers/**/*.js",
            "middleware/**/*.js",
            "models/**/*.js",
            "routes/**/*.js",
            "public/**/*.js"
        ],

        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",

            globals: {
                ...globals.node,
                ...globals.browser
            }
        },

        rules: {
            // Correctness
            "no-unused-vars": "error",
            "no-undef": "error",
            "no-console": "off",

            // maintainability / complexity quality gate
            "complexity": ["error", { max: 10 }],

            // limits nested conditional blocks
            "max-depth": ["error", { max: 4 }],

            //max lines per function
            "max-lines-per-function": [
                "error",
                {
                    max: 60,
                    skipBlankLines: true,
                    skipComments: true
                }
            ],

            //restricts max amount of parameters
            "max-params": ["error", { max: 4 }],

            //restricts max code statements in a function
            "max-statements": ["error", { max: 30 }],

            //max total lines in a file
            "max-lines": [
                "error",
                {
                    max: 300,
                    skipBlankLines: true,
                    skipComments: true
                }
            ]
        }
    },

    //setup for unit and integration test scripts
    {
        files: ["tests/**/*.js"],

        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",

            globals: {
                ...globals.node,
                ...globals.jest
            }
        },

        rules: {
            //way more relaxed due to them being for testing
            "no-unused-vars": "error",
            "no-undef": "error",
            "no-console": "off"
        }
    }
];