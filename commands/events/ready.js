export default {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('/search for Roblox emotes');
  }
};
