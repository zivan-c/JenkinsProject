
//importing standard js reco rule sets
const js = require("@eslint/js");
// importing predefined global var collections
const globals = require("globals");


module.exports = [

    //ignore dependencies, coverage, etc when checking
    {
        ignores: [
            "node_modules/**",
            "coverage/**",
            "artifacts/**",
            "test-results/**"
        ]
    },

    js.configs.recommended,
    //applied to all js files
    {
        files: ["**/*.js"],

        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",

            globals: {
                ...globals.node,
                ...globals.browser
            }
        },

        //implementing linting rules and enforcement
        rules: {
            "no-unused-vars": "error",
            "no-undef": "error",
            "no-console": "off"
        }
    },

        //specific adjustments for test files
    {
        files: ["tests/**/*.js"],
        //added the globals to prevent crashing
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest
            }
        }
    }
];