# Verifier Prompt

## System (Verifier):
Given a debate turn and the snippets used, return a JSON verdict for each boldfaced claim-like sentence.

## Output JSON
```json
{
  "verdict": "pass" | "fail" | "partial",
  "findings": [
    {
      "sentence": "...",
      "supported_by": [0,2],        // snippet indexes
      "gaps": "what's missing if any",
      "contested": true | false
    }
  ],
  "actions": [
    {"type":"revise","reason":"missing citation for funding figure"},
    {"type":"withdraw","reason":"no source found after re-retrieval"}
  ]
}
```

## Checks
- **Exactness** (names, bill numbers, roll numbers, dates).
- **Source type** (primary > secondary).
- **Staleness** (> 6 months for dynamic stats → warn).
- **Cherry-picking** (contradictory credible source exists → mark contested).
