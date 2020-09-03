//If something needs to know the permissions for this command, it looks here
exports.permissions = (client) => {
    return perms = {
        botChannel: true,           //If true, bot only responds in bot channels
        adminBotChannel: true,     //If true, bot only responds in admin bot channels
        role: client.config.get('perms').admin     //Last word specifies permission level needed to use this command
    }
}

//This code is run when the command is executed
exports.run = async (client, message, args) => {
    if (args.length != 2) return;
    if (!client.playerDB.has(args[0])) return;
    let rep = parseInt(args[1], 10);

    if (rep == NaN) return;

    await initialisePlayer(client, args[0]);

    let player = client.playerDB.get(args[0]);
    player.reputation += rep;
    client.playerDB.set(args[0], player);

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
    
    const helpMessage = `Adds reputation to a specified player - can use negative numbers

Usage: ${client.config.get('baseConfig').prefix}addrep <player ID> <amount of rep to add>`;

    const embed = new RichEmbed()
    .setTitle('Help for TEST')
    .setColor(client.config.get('baseConfig').colour)
    .setDescription(helpMessage);

    message.channel.send(embed);
};