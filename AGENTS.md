<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project evidence rule

After every significant completed development milestone, automatically preserve a truthful GitHub evidence checkpoint.

Required files to update:

- `PROJECT_PROGRESS.md` — completed work, current state, and exact continuation point.
- `docs/ip-evidence/R&D_LOG.md` — task, problem, options, Volodymyr Rudyi's decision, implementation, test, and result.
- `docs/ip-evidence/AI_ASSISTANCE_LOG.md` — state that Volodymyr Rudyi is the project owner and human who defines requirements, makes decisions, tests/reviews, and approves results; ChatGPT (OpenAI) is AI development assistance.
- `docs/ip-evidence/IP_EVIDENCE.md` — important PRs, commits, deployments, CI, tests, human validations/screenshots when real evidence exists, and other verifiable artifacts.

For important changes, create a dedicated commit/PR/checkpoint and record the real SHA. Never fabricate/backfill evidence. Never commit passwords, API keys, license keys, OAuth tokens/secrets, or other credentials. Human manual tests must be labeled as human validation. If a third-party human developer contributes, record that contribution truthfully.

Project-history wording must remain accurate: the product is developed by Volodymyr Rudyi with AI assistance; Volodymyr defines requirements and direction, makes decisions, tests/reviews, and approves results. AI assists with analysis, code, documentation, tests, debugging, and technical options.
