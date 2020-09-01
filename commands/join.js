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

    //get a list of squads to join
    let squads = [];

    for (let i = 0; i < args.length; i++) {
        if (parseInt(args[i], 10) < client.config.get('baseConfig').maxSquads && parseInt(args[i], 10) >= 0) {
            squads.push(args[i]);
        }
    }

    if (squads.length == 0) {
        message.reply(createEmbed(client,"Error - no squad IDs found","Please supply at least one squad number to join"))
        .then((msg) => {
            msg.delete(10000);
            message.delete(5000);
        })
        .catch(() => {
            let catchMessage = 'Handled rejection - caught in Join - no squad IDs'
            console.log(catchMessage);

            let logChannel = client.channels.find(channel => channel.id === client.config.get('channelConfig').logChannel);
            logChannel.send(`<@198269661320577024>, ${catchMessage}`);
        });
        return;
    }

    let sendString = "Subscribing to squads: ";
    let badSquads = "";
    let subbedSquads = false;

    let editMessages = [];

    //for each squad
    for (let i = 0; i < squads.length; i++) {
        //see if squad exists
        if (client.lobbyDB.has(squads[i])) {
            let currentSquad = client.lobbyDB.get(squads[i]);

            //see if it's closed
            if (!currentSquad.open || currentSquad.playerCount == 4) {
                badSquads = badSquads + squads[i] + ", ";
            //see if we're already subbed to it
            } else if (currentSquad.joinedIDs.includes(message.author.id) || currentSquad.hostID == message.author.id) {
                
                subbedSquads = true;
            } else {
                //squad exists, and we can sub to it

                //if it's about to be full, quickly lock it to avoid race condition
                if (currentSquad.playerCount == 3) {
                    //OLD
                    //client.lobbyDB.setProp(squads[i], "open", false);
                    //currentSquad.open = false;

                    //update "full" playercount ASAP so nobody else can join
                    client.lobbyDB.setProp(squads[i], "playerCount", 4);
                }

                //add squad to list of squads we're subbing to
                sendString = sendString + squads[i] + ", ";

                //update squad object
                currentSquad.playerCount = currentSquad.playerCount + 1;
                currentSquad.joinedIDs.push(message.author.id);

                //save to DB
                client.lobbyDB.set(squads[i], currentSquad);

                //edit the lobby message
                editMessages.push({messageID: currentSquad.messageID, messageIndex: currentSquad.countIndex, count: currentSquad.playerCount, lobbyID: currentSquad.lobbyID});
                

                //check if now full
                if (currentSquad.playerCount == 4) {
                    //send notification to subscribers
                    let IDs = [];
                    let pingMessage = "Host: <@" + currentSquad.hostID + ">, Joined players: ";
                    IDs.push(currentSquad.hostID);

                    for (id of currentSquad.joinedIDs) {
                        pingMessage = pingMessage + "<@" + id + "> "
                        IDs.push(id);
                    }

                    addRep(client, IDs);

                    //add "filled" message to array to send later
                    let filledMessage = new FutureMessage(pingMessage, createEmbed(client,"Squad filled",`Squad ${squads[i]} has been filled\n(${currentSquad.messageContent})`))
                    futureMessages.push(filledMessage);

                    fillSquad(client, currentSquad.lobbyID, message.channel);
                }
            }
            
        } else {
            //desn't exist
            badSquads = badSquads + squads[i] + ", ";
        }
    }

    if (badSquads != "") {
        message.reply(createEmbed(client, "Error - can't join","Can't join the following squads (they may be full, closed or non-existent): " + badSquads.substring(0,badSquads.length-2)))
        .then((msg) => {
            msg.delete(10000);
        })
        .catch(() => {
            let catchMessage = 'Handled rejection - caught in Join - bad squads'
            console.log(catchMessage);

            let logChannel = client.channels.find(channel => channel.id === client.config.get('channelConfig').logChannel);
            logChannel.send(`<@198269661320577024>, ${catchMessage}`);
        });
    }

    if (sendString == "Subscribing to squads: ") {
        /*message.reply ("Didn't subscribe to any squads")
        .then((msg) => {
            msg.delete(10000);
        });*/
    } else {
        message.reply(createEmbed(client, "Success", sendString.substring(0,sendString.length-2)))
        .then((msg) => {
            msg.delete(10000);
        })
        .catch(() => {
            let catchMessage = 'Handled rejection - caught in Join - Success'
            console.log(catchMessage);

            let logChannel = client.channels.find(channel => channel.id === client.config.get('channelConfig').logChannel);
            logChannel.send(`<@198269661320577024>, ${catchMessage}`);
        });
    }

    if (subbedSquads) {
        message.reply(createEmbed(client,"Error - already joined","Some squads weren't joined because you were already subscribed"))
        .then((msg) => {
            msg.delete(10000);
        })
        .catch(() => {
            let catchMessage = 'Handled rejection - caught in Join - already joined'
            console.log(catchMessage);

            let logChannel = client.channels.find(channel => channel.id === client.config.get('channelConfig').logChannel);
            logChannel.send(`<@198269661320577024>, ${catchMessage}`);
        });
    }

    //send all the filled messages
    let recruitChatChannel = client.channels.find(channel => channel.id === client.config.get('channelConfig').recruitChatChannel);
    while (futureMessages.length > 0) {
        let newMessage = futureMessages.pop();
        recruitChatChannel.send(newMessage.message, newMessage.embed);
    }
    
    doEdits(client, editMessages, message.channel);

    message.delete(5000)
    .catch(() => {
        let catchMessage = 'Handled rejection - caught in Join - success'
        console.log(catchMessage);

        let logChannel = client.channels.find(channel => channel.id === client.config.get('channelConfig').logChannel);
        logChannel.send(`<@198269661320577024>, ${catchMessage}`);
    });
    
};

async function addRep(client, IDs) {
    for (id of IDs) {
        await initialisePlayer(client, id);
        let currentPlayer = client.playerDB.get(id);
        currentPlayer.reputation++;
        client.playerDB.set(id, currentPlayer);
    }
}

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

function initialisePlayer(client, id) {
    if (client.playerDB.has(id)) return;
    let initialState = {
        mute: false,
        reputation: 0,
        lastSeen: null
    }
    client.playerDB.set(id, initialState);
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

exports.help = (client, message) => {
    const { Client, RichEmbed } = require('discord.js');
    
    const helpMessage = `Subscribes you to a particular squad or squads. You will be alerted when the squad fills.

Usage: ${client.config.get('baseConfig').prefix}join <squad ID(s)>

(In the hosting message, the bold number in brackets is the squad's ID)
Example: You want to join the following group -  

**SomeHostUser:**
h __Axi N5__ 2b2 1/4 {**5**}

Use: ${client.config.get('baseConfig').prefix}join 5

You can also use __${client.config.get('baseConfig').prefix}j__ or __${client.config.get('baseConfig').prefix}y__ if you prefer.`;

    const embed = new RichEmbed()
    .setTitle('Help for Join')
    .setColor(client.config.get('baseConfig').colour)
    .setDescription(helpMessage);

    message.channel.send(embed);
};

