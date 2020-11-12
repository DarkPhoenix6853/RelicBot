//If something needs to know the permissions for this command, it looks here
exports.permissions = (client) => {
    return perms = {
        botChannel: true,           //If true, bot only responds in bot channels
        adminBotChannel: false,     //If true, bot only responds in admin bot channels
        role: client.config.get('perms').user     //Last word specifies permission level needed to use this command
    }
}

//This code is run when the command is executed
exports.run = (client, message, args) => {
    const { Client, RichEmbed } = require('discord.js');

    let name = "<@198269661320577024>";

    const embed = new RichEmbed()
    .setTitle("Donation information")
    .setColor(client.config.get('baseConfig').colour)
    .setDescription(`This bot was created by ${name}. You can support my work at these links:
[BuyMeACoffee](https://www.buymeacoffee.com/DarkPhoenix6853)
[Liberapay](https://liberapay.com/DarkPhoenix6853/)`);

    message.channel.send(embed);

};