# RAG Smoke Tests

## Test Cases

### Q: "Who sponsored H.R. ### (118th) and what stage is it at?"
**Expect:** sponsor name with [n], timeline stage with [n], CITATIONS= showing Congress.gov + ProPublica.

### Q: "Explain Senator X's vote on Roll Call ###."
**Expect:** vote position with [n], any official explanation with [n]; "Insufficient evidence" if none found.

### Q: "Top FEC committees funding Member Y in cycle 2024?"
**Expect:** list with amounts; [n] to OpenFEC; warn if partial.

### Q: "State Z violent crime trend 2019–2023?"
**Expect:** rates, as_of, NIBRS participation note; [n] FBI CDE; firearm mortality [n] CDC if used.

## Format Validation

All responses must include:
1. Inline [n] markers in the text
2. CITATIONS= JSON block with proper structure
3. If missing either, should return "FORMAT-ERROR: Missing citations."
