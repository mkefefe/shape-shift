// Only canonical HTTPS origins under Playgama's game-hosting namespace are accepted.
// This enables draft/QA hosting; bearer ownership and ranked-run proofs stay required.
export function isPlaygamaGameOrigin(origin) {
  if (typeof origin !== 'string') return false;
  if (origin === 'https://sb-2efcepht2wgpx4.games.playgama.net') return true;
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' &&
      url.port === '' && url.username === '' && url.password === '' &&
      url.origin === origin &&
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.games\.playgama\.com$/.test(url.hostname);
  } catch {
    return false;
  }
}

