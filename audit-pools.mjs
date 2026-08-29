import { STRANDS } from "./src/lib/strands.ts";

const SAMPLES = 4000;
const ROUND_LENGTH = 10;

for (const strand of STRANDS) {
  for (let difficulty = 1; difficulty <= 10; difficulty++) {
    const signatures = new Map();
    for (let i = 0; i < SAMPLES; i++) {
      const p = strand.generateProblem(difficulty);
      const sig = `${p.kind}|${p.prompt}`;
      signatures.set(sig, (signatures.get(sig) || 0) + 1);
      if (signatures.size >= 500) break; // ya sabemos que es "grande", no seguir
    }
    const distinct = signatures.size;
    const flag = distinct < ROUND_LENGTH ? "  <-- RIESGO (pool < 10)" : "";
    console.log(`${strand.slug.padEnd(11)} d${String(difficulty).padStart(2)}  distintos>=${distinct}${flag}`);
  }
}
