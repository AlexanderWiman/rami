/**
 * Q&A feature types: QAItem with id, title, body, tags, sources, language.
 */
import type { Language } from '../prayer/types';

export interface QAItem {
  id: string;
  title: string;
  body: string;
  tags: string[];
  sources: string[];
  language: Language;
}
