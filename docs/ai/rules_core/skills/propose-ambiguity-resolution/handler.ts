/* Handler: propose-ambiguity-resolution
 * - Given ambiguous text, propose 2-3 concrete options (A/B/C) with pros/cons
 * - Produce one clear question that, when answered, decides which option to take
 */

export async function handle(payload: { context: string }) {
  const { context } = payload;

  // Simple heuristic template: extract ambiguous phrases and generate options.
  const options = [
    { id: "A", summary: "Option A - conservative", pros: ["Safer"], cons: ["May be slower"] },
    { id: "B", summary: "Option B - permissive", pros: ["Faster"], cons: ["Requires more validation"] }
  ];
  const question = "Do you prefer Option A (conservative) or Option B (permissive)?";

  return { options, question };
}