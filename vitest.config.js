"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        include: ['src/tests/unit/**/*.test.ts'],
        exclude: ['out/**', 'node_modules/**', 'src/test/suite/**'],
        environment: 'node',
    },
});
//# sourceMappingURL=vitest.config.js.map