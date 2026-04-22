module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: [".*\\.spec\\.ts$", ".*\\.e2e-spec\\.ts$"],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/main.ts", "!src/**/*.module.ts"],
  coverageDirectory: "coverage",
  testEnvironment: "node",
};