# Repository Guidelines

## Project Structure & Module Organization

This repository is currently a minimal project scaffold. `README.md` is the only project file and contains the project title. Keep top-level files limited to repository-wide documentation and configuration. As implementation is added, place application code under `src/`, automated tests under `tests/`, and non-code resources under `assets/`. Mirror source paths in tests where practical; for example, test `src/patients/records.py` with `tests/patients/test_records.py`. Update this guide and `README.md` whenever the structure changes.

## Build, Test, and Development Commands

No build system, dependency manifest, or test runner is configured yet. Before adding code, document the chosen toolchain in `README.md` and provide reproducible commands through a standard task runner or package manifest. Contributors should then expose predictable commands such as:

- `npm run dev` or an equivalent command to start local development.
- `npm test` to run the complete automated test suite.
- `npm run lint` to check formatting and static-analysis rules.
- `npm run build` to produce a release artifact.

Do not commit generated build output or dependency directories.

## Coding Style & Naming Conventions

Follow the formatter and linter adopted by the first implementation language, and commit their configuration with the code. Until then, use UTF-8 text, four-space indentation for Markdown examples, descriptive names, and one trailing newline per file. Prefer `kebab-case` for documentation filenames, language-standard naming for code, and small modules organized by domain rather than by generic utility type.

## Testing Guidelines

Every behavior change should include an automated test once a test framework is introduced. Keep tests deterministic and independent of live services or real patient data. Name tests according to the selected framework and mirror the source hierarchy. Document any coverage threshold in the test configuration and README; none is currently established.

## Commit & Pull Request Guidelines

Git history currently contains only `first commit`, so no stable convention can be inferred. Use concise, imperative subjects such as `Add patient search validation`, with optional body text explaining rationale and tradeoffs. Pull requests should include a focused description, verification steps, linked issues, and screenshots for user-interface changes. Keep unrelated refactors separate and ensure all configured checks pass before requesting review.

## Security & Configuration

Never commit credentials, secrets, environment files, or identifiable health information. Provide sanitized examples (for example, `.env.example`) and describe required variables without real values. Use synthetic or anonymized fixtures in tests and documentation.
