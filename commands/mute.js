//If something needs to know the permissions for this command, it looks here
exports.permissions = (client) => {
    return perms = {
        botChannel: true,           //If true, bot only responds in bot channels
        adminBotChannel: false,     //If true, bot only responds in admin bot channels
        role: client.config.get('perms').user     //Last word specifies permission level needed to use this command
    }
}

//This code is run when the command is executed
exports.run = async (client, message, args) => {
    await initialisePlayer(client, message.author.id);

    let currentPlayer = client.playerDB.get(message.author.id);
    currentPlayer.mute = true;
    client.playerDB.set(message.author.id, currentPlayer);

    message.reply(`I will no longer ping you`);
};

function initialisePlayer(client, id) {
    if (client.playerDB.has(id)) return;
    let initialState = {
        mute: false,
        reputation: 0,
        lastSeen: null
    }
    client.playerDB.set(id, initialState);
}

//This code is run when "Help" is used to get info about this command
exports.help = (client, message) => {
    const { RichEmbed } = require('discord.js');
    
    const helpMessage = `Makes it so the bot won't ping you for subscribed relics. Does not unsubscribe you from any relics. 

Usage: ${client.config.get('baseConfig').prefix}mute`;

    const embed = new RichEmbed()
    .setTitle('Help for TEST')
    .setColor(client.config.get('baseConfig').colour)
    .setDescription(helpMessage);

    message.channel.send(embed);
};