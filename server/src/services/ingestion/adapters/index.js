import { remoteok } from './remoteok.js'; import { arbeitnow } from './arbeitnow.js'; import { remotive } from './remotive.js';
export const adapters = { remoteok, arbeitnow, remotive };
export const fallbackOrder = ['remoteok','arbeitnow','remotive'];
