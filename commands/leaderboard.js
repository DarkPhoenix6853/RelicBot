//If something needs to know the permissions for this command, it looks here
exports.permissions = (client) => {
    return perms = {
        botChannel: false,           //If true, bot only responds in bot channels
        adminBotChannel: false,     //If true, bot only responds in admin bot channels
        role: client.config.get('perms').user     //Last word specifies permission level needed to use this command
    }
}

//This code is run when the command is executed
exports.run = async (client, message, args) => {
    let startIndex = parseInt(args[0], 10);

    if (args.length == 0 || startIndex == NaN || startIndex < 0) startIndex = 0;

    //turn the index from human-readable into zero-indexed
    if (startIndex > 0) startIndex--;

    //get and sort all the players
    let PlayerArrayKeys = client.playerDB.indexes;
    let playerArray = [];
    for (let key of PlayerArrayKeys) {
        let playerObject = {
            id: key,
            data: client.playerDB.get(key)
        }

        playerArray.push(playerObject);
    }

    playerArray = reduceArray(playerArray);
    playerArray.sort(sortPlayers);

    let title = "Reputation Leaderboard";
    if (startIndex > 0) title += ` starting from position ${startIndex+1}`;

    let sendString = '';
    for (let i = startIndex; i < startIndex+10; i++) {

        if (i >= playerArray.length) continue;

        sendString += `${i+1}. `;
        member = await message.guild.fetchMember(playerArray[i].ID)
        sendString += `<@${member.id}> - `;
        sendString += playerArray[i].rep;
        sendString += '\n';
    }
    
    
    let embed = createEmbed(client, title, sendString);
    
    message.channel.send(embed);
};

function sortPlayers(A, B) {
    return B.rep - A.rep;
}

function reduceArray(players) {
    let newArray = [];
    for (player of players) {
        let ID = player.id;
        let rep = player.data.reputation;
        newArray.push({ID, rep});
    }

    return newArray;
}

function createEmbed(client, title, content) {
    const { Client, RichEmbed } = require('discord.js');
    return new RichEmbed()
    .setTitle(title)
    .setColor(client.config.get('baseConfig').colour)
    .setDescription(content);
}

//This code is run when "Help" is used to get info about this command
exports.help = (client, message) => {
    const { RichEmbed } = require('discord.js');
    
    const helpMessage = `Shows 10 position from the reputation leaderboard - either the top 10, or the next 10 starting from a specified position.

Usage (top 10): ${client.config.get('baseConfig').prefix}leaderboard
(from position X): ${client.config.get('baseConfig').prefix}leaderboard X`;

    const embed = new RichEmbed()
    .setTitle('Help for TEST')
    .setColor(client.config.get('baseConfig').colour)
    .setDescription(helpMessage);

    message.channel.send(embed);
};