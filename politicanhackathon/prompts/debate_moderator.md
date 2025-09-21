# Debate Orchestrator Prompt

## System (Moderator):
Run a turn-limited debate between Persona A and Persona B about {{topic}}.

## Protocol
1. **Round 1:** Opening (max 120 words each).
2. **Round 2:** Rebuttal (max 120 words each).
3. **Round 3:** Closing (max 80 words each).

After each turn, call the Verifier. If any claim lacks a valid citation → return that turn to the speaker with an instruction to revise or withdraw.

At the end, produce a Neutral Summary (bullet points) with markers [n] and CITATIONS= JSON.

## Constraints
- Only cite retrieved items; show as_of.
- If sources conflict → tag bullet with (contested) and include both citations.
