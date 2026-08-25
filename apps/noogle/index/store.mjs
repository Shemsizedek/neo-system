import fs from 'node:fs/promises';
import path from 'node:path';

export class NoogleIndexStore {
  constructor(file = 'data/noogle-index.json') {
    this.file = file;
    this.docs = [];
  }

  async load() {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      this.docs = Array.isArray(parsed.documents) ? parsed.documents : [];
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      this.docs = [];
    }
    return this.docs;
  }

  upsert(document) {
    const index = this.docs.findIndex(item => item.id === document.id || item.canonicalUrl === document.canonicalUrl);
    if (index >= 0) this.docs[index] = document;
    else this.docs.push(document);
    return document;
  }

  search(query, { limit = 20 } = {}) {
    const terms = String(query).toLowerCase().split(/\s+/).filter(Boolean);
    return this.docs
      .map(doc => {
        const haystack = `${doc.title || ''} ${doc.summary || ''} ${(doc.communityTerms || []).map(x => x.term).join(' ')}`.toLowerCase();
        const matches = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
        return { doc, matches };
      })
      .filter(item => item.matches > 0 || terms.length === 0)
      .sort((a, b) => (b.matches + (b.doc.rank?.score || 0)) - (a.matches + (a.doc.rank?.score || 0)))
      .slice(0, limit)
      .map(item => item.doc);
  }

  async save() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), documents: this.docs }, null, 2));
  }
}
