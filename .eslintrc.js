module.exports = {
  "extends": "airbnb",
  "env": {
    "node": true,
    "mocha": true
  },
  "rules": {
    "max-len": ["error", 120],
    "padded-blocks":["off"],
    "no-shadow": ["error", { "allow": ["done", "cb", "resolve", "reject", "err"] }],
    "spaced-comment": ["off"],
    "no-unused-vars": ["warn"],
    "prefer-destructuring": ["off"],
    "no-console": ["off"],
    "callback-return": ["error"],
    "arrow-body-style": ["off"]
  }
};