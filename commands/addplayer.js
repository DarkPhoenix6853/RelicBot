//If something needs to know the permissions for this command, it looks here
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

    //keep track of "filled" messages to send last
    let FutureMessage = function(message, embed) {
        this.message = message;
        this.embed = embed;
    }
    let futureMessages = [];

    //get a list of squads to add to
    let squads = [];
    let override = false;

    for (let i = 0; i < args.length; i++) {
        if (parseInt(args[i], 10) < client.config.get('baseConfig').maxSquads && parseInt(args[i], 10) >= 0) {
            squads.push(args[i]);
        } else if (args[i] == "-o") {
            override = true;
        }
    }

    if (squads.length == 0) {
        message.reply(createEmbed(client,"Error - no squad IDs found","Please supply at least one squad number to add a player to"))
        .then((msg) => {
            msg.delete(10000);
            message.delete(5000);
        });
        
        return;
    }

    let editMessages = [];
    let addedSquads = [];

    let overrideSquads = [];
    let badSquads = [];

    for (let squadID of squads) {

        if (!client.lobbyDB.has(squadID)) {
            badSquads.push(squadID);
            continue;
        }

        let squad = client.lobbyDB.get(squadID);

        //if squad closed or if we're not the host, ignore it
        if (!squad.open || squad.hostID != message.author.id) {
            badSquads.push(squadID)
            continue;
        }
        
        //if squad would fill from this command
        if (squad.playerCount == 3) {
            //check for override
            if (override) {
                //try to avoid race condition
                //OLD
                //client.lobbyDB.setProp(squadID, "open", false);
                //squad.open = false;

                //update "full" playercount ASAP so nobody else can join
                client.lobbyDB.setProp(squadID, "playerCount", 4);
            } else {
                //don't process this one, give player warning
                overrideSquads.push(squadID);
                continue;
            }
        }

        //add one to the player count
        squad.playerCount += 1;

        addedSquads.push(squadID);

        //add to DB
        client.lobbyDB.set(squadID, squad);

        //add to edits
        editMessages.push({messageID: squad.messageID, messageIndex: squad.countIndex, count: squad.playerCount, lobbyID: squad.lobbyID});
        
        //if now full, trigger full squad like join
        if (squad.playerCount == 4) {
            //send notification to subscribers
            let pingMessage = "Host: <@" + squad.hostID + ">, Joined players: ";

            for (id of squad.joinedIDs) {
                pingMessage = pingMessage + "<@" + id + "> "
            }

            //add "filled" message to array to send later
            let filledMessage = new FutureMessage(pingMessage, createEmbed(client,"Squad filled",`Squad ${squadID} has been filled\n(${squad.messageContent})`));
            futureMessages.push(filledMessage);

            fillSquad(client, squadID, message.channel);
        }
    }

    if (overrideSquads.length > 0) {
        message.reply(createEmbed(client,"Warning - Squads would fill",`The following squads would have filled: ${overrideSquads.join(", ")}\nIf this was intended, please add an -o argument to your command next time (see ${client.config.get('baseConfig').prefix}help addplayer)`))
        .then((msg) => {
            msg.delete(10000);
        });
    }

    if (badSquads.length > 0) {
        message.reply(createEmbed(client,"Error - Couldn't add",`Some squads could not have players added. Either they don't exist, you are not the host, or the squad has been closed: ${badSquads.join(', ')}`))
        .then((msg) => {
            msg.delete(10000);
        });
    }

    if (addedSquads.length > 0) {
        message.reply(createEmbed(client,"Success","Added phantom players to squads: " + addedSquads.join(", ")))
        .then((msg) => {
            msg.delete(10000);
        });
    } else {
        /*message.reply(createEmbed(client,"Error - no effect","No phantom players were added - see previous errors or contact devs if there are none"))
        .then((msg) => {
            msg.delete(10000);
        });*/
    }

    //send all the filled messages
    let recruitChatChannel = client.channels.find(channel => channel.id === client.config.get('channelConfig').recruitChatChannel);
    while (futureMessages.length > 0) {
        let newMessage = futureMessages.pop();
        recruitChatChannel.send(newMessage.message, newMessage.embed);
    }

    doEdits(client, editMessages, message.channel);

    message.delete(5000);
};

async function fillSquad(client, id, channel) {
    closeSquad(client, id);

    let thisSquad = client.lobbyDB.get(id);

    let squadPlayers = [];
    squadPlayers.push(thisSquad.hostID);
    for (player of thisSquad.joinedIDs) squadPlayers.push(player);

    //for each player
    for (player of squadPlayers) {
        //close all
        closeOthers(client, player);
    }

    for (player of squadPlayers) {
        //leave all
        pullPlayers(client, player, channel);
    }
}

async function pullPlayers(client, player, channel) {
    //editMessages.push({messageID: squad.messageID, messageIndex: squad.countIndex, count: squad.playerCount, lobbyID: squad.lobbyID});
    let editMessages = [];

    //find all other squads they're in
    for (let i = 0; i < client.config.get('baseConfig').maxSquads; i++) {
        //(if the squad ID exists)
        if (client.lobbyDB.has(i.toString())) {
            let squad = client.lobbyDB.get(i.toString());
            if (!squad.open) continue;
            //if they're in the squad
            if (squad.joinedIDs.includes(player)) {
                //leave it
                squad.playerCount--;
                squad.joinedIDs.splice(squad.joinedIDs.indexOf(player), 1);

                client.lobbyDB.set(i.toString(), squad);

                editMessages.push({messageID: squad.messageID, messageIndex: squad.countIndex, count: squad.playerCount, lobbyID: squad.lobbyID});

                //remove their reaction from that squad's message
                const message = await channel.fetchMessage(squad.messageID);
                const userReactions = message.reactions.filter(reaction => reaction.users.has(player));
                
                try {
                    for (let reaction of userReactions.values()) {
                        await reaction.remove(player);
                    }
                } catch(err) {

                }
                
            }
        }
    }

    doEdits(client, editMessages, channel);
}

function closeOthers(client, playerID) {
    //find all other squads they're hosting
    for (let i = 0; i < client.config.get('baseConfig').maxSquads; i++) {
        //(if the squad ID exists)
        if (client.lobbyDB.has(i.toString())) {
            let squad = client.lobbyDB.get(i.toString());
            //if they're the same host
            if (squad.hostID == playerID) {
                //close it
                closeSquad(client, i.toString());
            }
        }
    }
}

async function closeSquad (client, id) {

    //get the squad
    const squad = client.lobbyDB.get(id);

    //check if already closed
    if (!squad.open) return;

    //close the squad
    client.lobbyDB.setProp(id, "open", false);

    
    //delete the host message
    //SPLIT RECRUITS
    //const channel = squad.channel;
    const channelID = client.config.get('channelConfig').recruitChannel;
    const messageID = squad.messageID;

    const channel = client.channels.get(channelID);
    let messageNotFound = false;
    await channel.fetchMessage(messageID)
    .catch(() => {
        messageNotFound = true;
        let logChannel = client.channels.find(channel => channel.id === client.config.get('channelConfig').logChannel);
        logChannel.send(`<@198269661320577024> Error deleting message for squad ${id} for message ID ${messageID}. Does it exist?`);
    })
    .then(squadMessage => {
        if (!messageNotFound) squadMessage.delete();
    })
    
}

async function doEdits(client, editMessages, channel) {
    const { Client, RichEmbed } = require('discord.js');

    let currentMessage = null;
    for (let edit of editMessages) {

        if (edit.count == 4) continue;

        let messageNotFound = false;

        if (currentMessage == null || currentMessage.id != edit.messageID) {

            currentMessage = await channel.fetchMessage(edit.messageID)
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
    const { Client, RichEmbed } = require('discord.js');
    
    const helpMessage = `Usable only by a squad host. 
Adds one non-discord player to the squad. Useful for if a host finds players in-game. 
If using this command would fill the squad (which is not reversible) it requires the host to supply a -o tag (shown below)

Usage (cannot fill squad): ${client.config.get('baseConfig').prefix}AddPlayer <squad ID(s)>
OR (can fill squad): ${client.config.get('baseConfig').prefix}AddPlayer -o <squad ID(s)>`;

    const embed = new RichEmbed()
    .setTitle('Help for AddPlayer')
    .setColor(client.config.get('baseConfig').colour)
    .setDescription(helpMessage);

    message.channel.send(embed);
};