import axios from 'axios';
import * as cheerio from 'cheerio';
import { config } from '../../config.js';
import { IngestionError } from './errors.js';
import { normalizeJob } from './normalize.js';
import { sleep } from './retryPolicy.js';

const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/133 Safari/537.36', Accept: 'application/json,text/html;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9', Referer: 'https://remoteok.com/' };
export async function primaryFetch() {
  await sleep(800 + Math.floor(Math.random() * 1701));
  let response;
  try { response = await axios.get(config.sourceUrl, { headers, timeout: 15000, responseType: 'text', validateStatus: (s) => s >= 200 && s < 300 }); }
  catch (error) { throw new IngestionError(error.message, error.response?.status === 429 ? 'RATE_LIMIT' : 'NETWORK'); }
  const contentType = response.headers['content-type'] || '';
  let rows = [];
  if (contentType.includes('json') || String(response.data).trim().startsWith('[')) {
    try { const body = typeof response.data === 'string' ? JSON.parse(response.data) : response.data; rows = body.filter((row) => row?.position || row?.title); }
    catch { throw new IngestionError('RemoteOK returned malformed JSON', 'MALFORMED_RESPONSE'); }
  } else {
    const $ = cheerio.load(response.data); $('tr.job').each((_, el) => rows.push({ id: $(el).attr('data-id'), position: $(el).find('.company_and_position h2').text(), company: $(el).find('.company_and_position h3').text(), location: $(el).find('.location').first().text(), tags: $(el).find('.tag').map((__, tag) => $(tag).text()).get(), url: new URL($(el).attr('data-href') || '/', 'https://remoteok.com').href }));
    if (!rows.length) throw new IngestionError('Expected RemoteOK job selectors returned zero results', 'SELECTOR_MISMATCH');
  }
  const jobs = rows.map((row) => normalizeJob(row, 'RemoteOK')).filter((job) => job.title && job.url);
  if (!jobs.length) throw new IngestionError('Source returned no valid jobs', 'EMPTY_RESPONSE');
  return jobs;
}
