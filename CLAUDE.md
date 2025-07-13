# Best practices

- Read [README.md](README.md) for general instructions
  that all developers (human and AI) should know about.

- Never add comments that disable eslint or typescript
  rules. Don't change the eslint or typescript configuration,
  either.

- Never typecast anything to `any`.

- After making code changes, run the following in order:
  1. `npm run prettier` to reformat code
  2. `npm run typecheck` to typecheck and lint
  3. `npm run test` to run all tests
