//If something needs to know the permissions for this command, it looks here
exports.permissions = (client) => {
    return perms = {
        botChannel: false,           //If true, bot only responds in bot channels
        adminBotChannel: false,     //If true, bot only responds in admin bot channels
        role: client.config.get('perms').admin    //Last word specifies permission level needed to use this command
    }
}

//This code is run when the command is executed
exports.run = (client, message, args) => {
    message.channel.send("Shutting down");
    console.log(`Killed by: ${message.author.tag}`);
    setTimeout((function() {
        return process.exit(0);
    }), 1000);
};

//This code is run when the help command is used to get info about this command
exports.help = (client, message) => {
    const { Client, RichEmbed } = require('discord.js');
    
    const helpMessage = `Murder the bot. Needs to be restarted from the host server. 
This command is only to be used if the bot is threatening the safety of the server somehow. 

Usage: ${client.config.get('baseConfig').prefix}kill`;

    const embed = new RichEmbed()
    .setTitle('Help for Kill')
    .setColor(client.config.get('baseConfig').colour)
    .setDescription(helpMessage);

    message.channel.send(embed);
};

