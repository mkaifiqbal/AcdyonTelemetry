# Design and Resilience Notes

## Detection surface
Automated clients can expose themselves through repetitive timing, implausible headers, missing browser state, headless fingerprints, high request volume, and rigid selectors. This demo accounts for pacing with 800-2500 ms jitter, browser-like request headers, limited retries with exponential backoff, and a realistic Playwright viewport/locale on fallback. It deliberately does not spoof identities, defeat CAPTCHAs, rotate accounts, or bypass access controls.

## Ingestion strategy
Axios handles RemoteOK JSON or HTML on the efficient path. Two consecutive primary failures move the run to Playwright. Attempts use exponential delay plus jitter, and the in-process circuit breaker opens after three fully failed runs for a five-minute cooldown. The single-process active-run guard prevents overlapping manual and scheduled work. A production multi-instance service would replace that guard and breaker state with Redis or MongoDB leases.

## Resilience
Network failures, rate limits, malformed payloads, empty responses, browser failures, and selector mismatches have distinct error types in persisted attempt logs. Zero valid jobs never counts as success. Jobs use a stable SHA-256 hash and MongoDB upserts for deduplication. Runs remain inspectable without repeating the scrape.

## Ethical line
This project reads only RemoteOK's public, low-risk source and does not target LinkedIn, Indeed, Naukri, a logged-in account, or personal data. My line is clear: robots guidance and source terms matter; authentication, CAPTCHAs, technical access controls, and explicit prohibitions are boundaries rather than engineering challenges. A production integration should prefer licensed APIs or written permission.
