import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import express from 'express';
import scraper from './scraper.js';

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID || !LOG_CHANNEL_ID) {
  console.error('Missing one or more environment variables.');
  process.exit(1);
}

// Create Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Load commands dynamically
const commandsPath = path.resolve('./commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];
for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  client.commands.set(command.default.data.name, command.default);
  commands.push(command.default.data.toJSON());
}

// Register slash commands (guild-based for quick updates)
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

// Load events
const eventsPath = path.resolve('./events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = await import(`./events/${file}`);
  if (event.default.once) {
    client.once(event.default.name, (...args) => event.default.execute(...args, client, LOG_CHANNEL_ID));
  } else {
    client.on(event.default.name, (...args) => event.default.execute(...args, client, LOG_CHANNEL_ID));
  }
}

// Start the scraper to run every 24 hours
scraper(); // Run immediately at start
setInterval(scraper, 24 * 60 * 60 * 1000); // Repeat every 24h

// Express server to keep bot alive on Replit
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Roblox Emote Bot is running!');
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

// Login Discord client
client.login(TOKEN);
