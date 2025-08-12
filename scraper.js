import fetch from 'node-fetch';
import cheerio from 'cheerio';
import fs from 'fs/promises';

const EMOTES_FILE = './emotes.json';

// Helper: delay function
const delay = ms => new Promise(res => setTimeout(res, ms));

export default async function scrape() {
  console.log('Starting emote scraping...');
  const baseUrl = 'https://www.roblox.com/catalog?Category=12&Subcategory=39&salesTypeFilter=1';
  let page = 1;
  let allEmotes = [];

  // Load existing emotes
  let existingEmotes = [];
  try {
    const fileData = await fs.readFile(EMOTES_FILE, 'utf-8');
    existingEmotes = JSON.parse(fileData);
  } catch {
    existingEmotes = [];
  }
  const existingIds = new Set(existingEmotes.map(e => e.id));

  while (true) {
    const url = `${baseUrl}&Page=${page}`;
    console.log(`Fetching page ${page}...`);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Failed to fetch page ${page}: ${res.statusText}`);
        break;
      }
      const text = await res.text();
      const $ = cheerio.load(text);

      const catalogItems = $('[data-testid="catalog-item-card"]');

      if (catalogItems.length === 0) {
        console.log('No more catalog items found, ending pagination.');
        break;
      }

      let newEmotesThisPage = 0;
      for (let i = 0; i < catalogItems.length; i++) {
        const el = catalogItems.eq(i);

        const link = el.find('a').attr('href');
        if (!link) continue;

        const idMatch = link.match(/\/catalog\/(\d+)\//);
        if (!idMatch) continue;
        const id = idMatch[1];

        if (existingIds.has(id)) continue; // skip duplicates

        const name = el.find('[data-testid="catalog-item-name"]').text().trim() || 'No name';
        const preview = el.find('img').attr('src') || '';

        // Fetch detail page for description
        let description = 'No description';
        try {
          const detailUrl = `https://www.roblox.com${link}`;
          const detailRes = await fetch(detailUrl);
          if (detailRes.ok) {
            const detailText = await detailRes.text();
            const $d = cheerio.load(detailText);
            const metaDesc = $d('meta[name="description"]').attr('content');
            if (metaDesc) description = metaDesc.trim();
          }
          await delay(500); // Be polite, delay between requests
        } catch (err) {
          console.error(`Failed to fetch description for emote ${id}:`, err);
        }

        const robloxLink = `https://www.roblox.com/catalog/${id}`;
        const dateAdded = new Date().toISOString();

        const emote = {
          id,
          name,
          description,
          preview,
          robloxLink,
          dateAdded
        };

        allEmotes.push(emote);
        existingIds.add(id);
        newEmotesThisPage++;
      }

      console.log(`Found ${newEmotesThisPage} new emotes on page ${page}.`);
      if (newEmotesThisPage === 0) break;

      page++;
      await delay(1500); // polite delay before next page
    } catch (error) {
      console.error('Error during scraping:', error);
      break;
    }
  }

  if (allEmotes.length > 0) {
    const combined = existingEmotes.concat(allEmotes);
    try {
      await fs.writeFile(EMOTES_FILE, JSON.stringify(combined, null, 2));
      console.log(`Added ${allEmotes.length} new emotes. Total emotes: ${combined.length}`);
    } catch (err) {
      console.error('Failed to save emotes.json:', err);
    }
  } else {
    console.log('No new emotes found during scraping.');
  }
}
