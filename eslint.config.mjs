// Root ESLint flat config.
//
// Per-package ESLint configs live at:
//   - app/eslint.config.mjs
//   - workers/ke-api/eslint.config.mjs
//
// This root config exists so that `lint-staged` (which runs `eslint --fix`
// from the repo root) has a resolvable config. It ignores everything by
// default; the per-package configs are authoritative and are invoked by
// each workspace's `npm run lint` script in CI.
export default [
  {
    ignores: ['**/*'],
  },
]
