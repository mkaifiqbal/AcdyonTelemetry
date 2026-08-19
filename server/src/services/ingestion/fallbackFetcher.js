import { chromium } from 'playwright';
import { config } from '../../config.js';
import { IngestionError } from './errors.js';
import { normalizeJob } from './normalize.js';

export async function fallbackFetch() {
  if (!config.playwrightEnabled) throw new IngestionError('Playwright fallback is disabled', 'FALLBACK_DISABLED');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/133 Safari/537.36' });
    const page = await context.newPage();
    // A realistic viewport, locale, and UA reduce trivial headless fingerprint differences; this is resilience, not a bypass of access controls.
    await page.goto('https://remoteok.com/remote-jobs', { waitUntil: 'networkidle', timeout: 30000 });
    const rows = await page.locator('tr.job').evaluateAll((els) => els.map((el) => ({ id: el.dataset.id, position: el.querySelector('h2')?.textContent, company: el.querySelector('h3')?.textContent, location: el.querySelector('.location')?.textContent, tags: [...el.querySelectorAll('.tag')].map((tag) => tag.textContent), url: new URL(el.dataset.href || '/', location.origin).href })));
    if (!rows.length) throw new IngestionError('Fallback selectors returned zero jobs', 'SELECTOR_MISMATCH');
    return rows.map((row) => normalizeJob(row, 'RemoteOK')).filter((job) => job.title && job.url);
  } catch (error) { if (error instanceof IngestionError) throw error; throw new IngestionError(error.message, 'BROWSER_FAILURE'); }
  finally { await browser?.close(); }
}
