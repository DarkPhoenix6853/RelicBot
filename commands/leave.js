exports.permissions = (client) => {
    return perms = {
        botChannel: false,           //If true, bot only responds in bot channels
        adminBotChannel: false,     //If true, bot only responds in admin bot channels
        role: client.config.get('perms').user     //Last word specifies permission level needed to use this command
    }
}

//This code is run when the command is executed
exports.run = (client, message, args) => {

    //make sure we're in Recruiting
    if (client.config.get('channelConfig').recruitChannel != message.channel.id) {
        message.reply("That command is only for the recruiting channel, sorry");
        return;
    }

    //get a list of squads to leave
    let squads = [];
    if (args.length > 0 && args[0].toLowerCase() == 'all') {
        for (let i = 0; i < client.config.get('baseConfig').maxSquads; i++) {
            squads.push(i.toString());
        }

    } else {
        for (let i = 0; i < args.length; i++) {
            if (parseInt(args[i], 10) < client.config.get('baseConfig').maxSquads && parseInt(args[i], 10) >= 0) {
                squads.push(args[i]);
            }
        }
    }

    if (squads.length == 0) {
        message.reply(createEmbed(client,"Error - no squad IDs found","Please supply at least one squad number to leave, or specify 'all'"))
        .then((msg) => {
            msg.delete(10000);
            message.delete(5000);
        })
        .catch(() => {
            let catchMessage = 'Handled rejection - caught in Leave - no squad IDs'
            console.log(catchMessage);

            let logChannel = client.channels.find(channel => channel.id === client.config.get('channelConfig').logChannel);
            logChannel.send(`<@198269661320577024>, ${catchMessage}`);
        });
        
        return;
    }

    let sendString = "Unsubscribing from squads: ";
    let errorMessage = "";
    let errorCount = 0;

    let editMessages = [];

    //for each squad
    for (let i = 0; i < squads.length; i++) {
        //see if squad exists
        if (client.lobbyDB.has(squads[i])) {
            let currentSquad = client.lobbyDB.get(squads[i]);
            
            if (currentSquad.hostID == message.author.id && !(args[0].toLowerCase() == 'all')) {
                if (errorCount == 0) {
                    errorMessage = errorMessage + `Error - can't leave a squad you're hosting. Use ${client.config.get('baseConfig').prefix}close instead\n`;
                    errorCount += 1;
                }
                
            }
            //see if we're subbed to it/if it's open
             else if (currentSquad.joinedIDs.includes(message.author.id) && currentSquad.open) {
                //squad exists, is open, and we have previously joined it

                //add squad to list of squads we're leaving
                sendString = sendString + squads[i] + ", ";

                //update squad object
                currentSquad.playerCount = currentSquad.playerCount - 1;
                currentSquad.joinedIDs.splice(currentSquad.joinedIDs.indexOf(message.author.id), 1);

                //save to DB
                client.lobbyDB.set(squads[i], currentSquad);

                //edit the lobby message
                editMessages.push({messageID: currentSquad.messageID, messageIndex: currentSquad.countIndex, count: currentSquad.playerCount, lobbyID: currentSquad.lobbyID});

                //remove our reaction
                message.channel.fetchMessage(currentSquad.messageID)
                .then((squadMessage) => {
                    const userReactions = squadMessage.reactions.filter(reaction => reaction.users.has(message.author.id));
                    try {
                        for (let reaction of userReactions.values()) {
                            reaction.remove(message.author.id);
                        }
                    } catch (err) {

                    }
                })
            } 
        } 
    }

    if (errorMessage != "") {
        message.reply (createEmbed(client,"Errors occurred:", errorMessage))
        .then((msg) => {
            msg.delete(10000);
        })
        .catch(() => {
            let catchMessage = 'Handled rejection - caught in Leave - Errors occurred'
            console.log(catchMessage);

            let logChannel = client.channels.find(channel => channel.id === client.config.get('channelConfig').logChannel);
            logChannel.send(`<@198269661320577024>, ${catchMessage}`);
        });
    } else if (sendString == "Unsubscribing from squads: ") {
        message.reply (createEmbed(client,"Error - no unsubs","Didn't unsub from any squads (You might have already been unsubbed)"))
        .then((msg) => {
            msg.delete(10000);
        })
        .catch(() => {
            let catchMessage = 'Handled rejection - caught in Leave - no unsubs'
            console.log(catchMessage);

            let logChannel = client.channels.find(channel => channel.id === client.config.get('channelConfig').logChannel);
            logChannel.send(`<@198269661320577024>, ${catchMessage}`);
        });
    } else {
        message.reply(createEmbed(client,"Success",sendString.substring(0,sendString.length-2)))
        .then((msg) => {
            msg.delete(10000);
        })
        .catch(() => {
            let catchMessage = 'Handled rejection - caught in Leave - Success'
            console.log(catchMessage);

            let logChannel = client.channels.find(channel => channel.id === client.config.get('channelConfig').logChannel);
            logChannel.send(`<@198269661320577024>, ${catchMessage}`);
        });
    }
    
    doEdits(client, editMessages, message);
};

async function doEdits(client, editMessages, message) {
    const { Client, RichEmbed } = require('discord.js');

    let currentMessage = null;
    for (let edit of editMessages) {

        let messageNotFound = false;

        if (currentMessage == null || currentMessage.id != edit.messageID) {

            currentMessage = await message.channel.fetchMessage(edit.messageID)
            .catch(() => {
                messageNotFound = true;
                let logChannel = client.channels.find(channel => channel.id === client.config.get('channelConfig').logChannel);
                logChannel.send(`<@198269661320577024> Error editing message for squad ${edit.lobbyID} for message ID ${edit.messageID}. Does it exist?`);
            });
        }

        if (messageNotFound) continue;

        const content = currentMessage.embeds[0].description;

        let newMessage = content.substring(0, edit.messageIndex);
        newMessage = newMessage + edit.count;
        newMessage = newMessage + content.substring(edit.messageIndex + 1, content.length);

        const embed = new RichEmbed()
        .setTitle(currentMessage.embeds[0].title)
        .setColor(client.config.get('baseConfig').colour)
        .setDescription(newMessage);

        await currentMessage.edit(embed);
    }

    message.delete(5000)
    .catch(() => {
        let catchMessage = 'Handled rejection - caught in Leave - Edits'
        console.log(catchMessage);

        let logChannel = client.channels.find(channel => channel.id === client.config.get('channelConfig').logChannel);
        logChannel.send(`<@198269661320577024>, ${catchMessage}`);
    });
}

function createEmbed(client, title, content) {
    const { Client, RichEmbed } = require('discord.js');
    return new RichEmbed()
    .setTitle(title)
    .setColor(client.config.get('baseConfig').colour)
    .setDescription(content);
}


exports.help = (client, message) => {
    const { Client, RichEmbed } = require('discord.js');
    
    const helpMessage = `Unsubscribes you to from particular squad or squads. You will no longer be alerted when the squad fills.
Alternatively, specify "all" to leave every squad you are subscribed to. 

Usage: ${client.config.get('baseConfig').prefix}leave <squad ID(s)>
OR: ${client.config.get('baseConfig').prefix}leave all`;

    const embed = new RichEmbed()
    .setTitle('Help for Leave')
    .setColor(client.config.get('baseConfig').colour)
    .setDescription(helpMessage);

    message.channel.send(embed);
};

