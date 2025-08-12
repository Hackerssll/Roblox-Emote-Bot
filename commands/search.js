import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs';

const EMOTES_FILE = './emotes.json';

export default {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for a Roblox emote by name')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Name of the emote')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    let emotes = [];

    try {
      emotes = JSON.parse(fs.readFileSync(EMOTES_FILE, 'utf-8'));
    } catch {
      emotes = [];
    }

    const filtered = emotes
      .filter(e => e.name.toLowerCase().includes(focusedValue))
      .slice(0, 25)
      .map(e => ({ name: e.name, value: e.id }));

    await interaction.respond(filtered);
  },

  async execute(interaction, client, LOG_CHANNEL_ID) {
    const emoteId = interaction.options.getString('name');
    let emotes = [];

    try {
      emotes = JSON.parse(fs.readFileSync(EMOTES_FILE, 'utf-8'));
    } catch {
      return interaction.reply({ content: 'Emote database is not available.', ephemeral: true });
    }

    const emote = emotes.find(e => e.id === emoteId || e.name.toLowerCase() === emoteId.toLowerCase());
    if (!emote) {
      return interaction.reply({ content: `No emote found matching \`${emoteId}\`.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(emote.name)
      .setDescription(emote.description || 'No description available.')
      .setURL(emote.robloxLink)
      .setImage(emote.preview)
      .setFooter({ text: `Added on ${new Date(emote.dateAdded).toLocaleDateString()}` })
      .setColor('Aqua');

    await interaction.reply({ embeds: [embed] });

    // Log search in the configured channel
    try {
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      if (logChannel && logChannel.isTextBased()) {
        await logChannel.send(`🔎 User **${interaction.user.tag}** searched for emote: **${emote.name}** (ID: ${emote.id})`);
      }
    } catch (error) {
      console.error('Failed to log search:', error);
    }
  }
};
