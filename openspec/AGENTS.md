# OpenSpec Workflow Rules (v3.3)

Standardized operational guidelines for AI coding agents working within this repository.

## Guiding Principles
- **Specification First:** Every change must have a corresponding proposal and specification in `openspec/changes/` before implementation begins.
- **Scope Discipline:** Never implement unapproved features. Adhere strictly to the active task list in `tasks.md`.
- **Zero Hallucinated Dependencies:** Only introduce packages explicitly approved in `project.md` or the active proposal.

## Change Lifecycle
1. **Explore:** Understand user intent and existing architecture before modifying code.
2. **Propose:** Create `openspec/changes/[change-id]/` with `proposal.md`, `tasks.md`, and capability specs.
3. **Approve:** Human collaborator reviews and approves the change artifacts.
4. **Apply:** Implement tasks incrementally, checking off boxes in `tasks.md` as each sub-task completes.
5. **Verify:** Run automated tests and linters before reporting completion.
6. **Archive:** Move completed changes to `openspec/archive/` upon integration.

## Tasks & Specification Standards
- Use RFC 2119 keywords (`MUST`, `SHOULD`, `MAY`, `MUST NOT`) for normative statements in specs.
- Structure user-facing test scenarios using `Given / When / Then` format.
- Grade task complexity:
  - **LOW:** Straightforward file edits, minimal branching, immediate validation.
  - **MID:** Cross-file integration, database schema migration, API endpoint + client hook.
  - **HIGH:** Architecture shift, multi-provider integration, complex file uploads & storage pipelines.

## File & Code Integrity
- Always maintain documentation integrity; never strip existing docstrings or comments.
- Adhere strictly to line budgets and naming conventions specified in root `CLAUDE.md`.
- Update `openspec/project.md` whenever core architecture, dependencies, or conventions change.
- Never commit secrets or credentials. Exclude `.codegraph/`, `.env*`, and local artifacts.
