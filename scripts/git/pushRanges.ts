// Turns the pre-push hook input into git log ranges for gitleaks (AVO-03, docs/adr/0014).
//
// Git writes one line per pushed ref: <local ref> <local sha> <remote ref> <remote sha>.
// A range covers the commits reachable from the pushed sha that are not yet on any remote, so a
// normal push, a new branch and a force push are all scanned without rescanning pushed history.

const SHA = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
const ZERO_SHA = /^0+$/;

export function pushRanges(input: string): string[] {
  const ranges = new Set<string>();
  for (const line of input.split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/);
    const localSha = fields[1];
    if (fields.length !== 4 || localSha === undefined || !SHA.test(localSha)) continue;
    // A deleted ref has an all-zero local sha and pushes no commits.
    if (ZERO_SHA.test(localSha)) continue;
    ranges.add(`${localSha} --not --remotes`);
  }
  return [...ranges];
}
