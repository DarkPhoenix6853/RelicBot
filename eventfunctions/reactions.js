exports.onRemove = (client, reaction, user) => {
    if (reaction.emoji.name == '✅') attemptLeave(client, reaction, user);
}

exports.onAddition = (client, reaction, user) => {
    if (reaction.emoji.name == '✅') attemptJoin(client, reaction, user);
    if (reaction.emoji.name == '❎') attemptClose(client, reaction, user);
}

function attemptJoin(client, reaction, user) {
    if (reaction.emoji.name != '✅') return;

    let squadID = findSquad(client, reaction.message.id);

    if (!squadID) return;

    //check that player isn't in the squad, or is the host
    let currentSquad = client.lobbyDB.get(squadID);
    if (currentSquad.hostID == user.id) {
        //remove their reaction from that squad's message
        const message = reaction.message;
        const userReactions = message.reactions.filter(reaction => reaction.users.has(user.id));
        
        try {
            for (let reaction of userReactions.values()) {
                reaction.remove(user.id);
            }
        } catch(err) {

        }
        return;
    } 
    if (currentSquad.joinedIDs.includes(user.id)) return;

    //they aren't, add them
    join(client, user.id, squadID, reaction.message.channel);
}

function attemptLeave(client, reaction, user) {
    //check if it's the right reaction
    if (reaction.emoji.name != '✅') return;
    //check if it's on a message we care about
    let squadID = findSquad(client, reaction.message.id);

    if (!squadID) return;

    //check if player is in the squad, or the host
    let currentSquad = client.lobbyDB.get(squadID);
    if (currentSquad.hostID == user.id) return;
    if (!currentSquad.joinedIDs.includes(user.id)) return;

    //they are in the squad, remove them
    leave(client, user.id, squadID, reaction.message.channel);
}

function join(client, userID, squadID, channel) {
    let currentSquad = client.lobbyDB.get(squadID);
    if (!currentSquad.open || currentSquad.playerCount == 4) return;

    currentSquad.playerCount++;
    currentSquad.joinedIDs.push(userID);

    client.lobbyDB.set(squadID, currentSquad);

    if (currentSquad.playerCount == 4) {
        fillSquad(client, squadID, channel);

        let pingMessage = "Host: <@" + currentSquad.hostID + ">, Joined players: ";
        for (id of currentSquad.joinedIDs) {
            pingMessage = pingMessage + "<@" + id + "> "
        }

        let recruitChatChannel = client.channels.find(channel => channel.id === client.config.get('channelConfig').recruitChatChannel);
        recruitChatChannel.send(pingMessage, createEmbed(client,"Squad filled",`Squad ${squadID} has been filled\n(${currentSquad.messageContent})`));
    }

    let editMessages = [];
    editMessages.push({messageID: currentSquad.messageID, messageIndex: currentSquad.countIndex, count: currentSquad.playerCount, lobbyID: currentSquad.lobbyID});

    doEdits(client, editMessages, channel);
}

function leave(client, userID, squadID, channel) {
    let currentSquad = client.lobbyDB.get(squadID);
    if (!currentSquad.open || currentSquad.playerCount == 4) return;

    currentSquad.playerCount--;
    currentSquad.joinedIDs.splice(currentSquad.joinedIDs.indexOf(userID), 1);

    client.lobbyDB.set(squadID, currentSquad);

    let editMessages = [];
    editMessages.push({messageID: currentSquad.messageID, messageIndex: currentSquad.countIndex, count: currentSquad.playerCount, lobbyID: currentSquad.lobbyID});

    doEdits(client, editMessages, channel);
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

async function attemptClose(client, reaction, user) {
    //check if it's the right reaction
    if (reaction.emoji.name != '❎') return;
    //check if it's on a message we care about
    let squadID = findSquad(client, reaction.message.id);
    if (!squadID) return;

    //check if player is the host or an admin
    let userPerms = await getPerms(reaction.message.channel.guild, user, client);

    let currentSquad = client.lobbyDB.get(squadID);
    if (currentSquad.hostID != user.id && userPerms < 10) return;

    //they are the host (or an admin), close it
    closeSquad(client, squadID);
}

function findSquad(client, messageID) {
    //for every squad
    for (let i = 0; i < client.config.get('baseConfig').maxSquads; i++) {
        index = i.toString();

        //check it exists
        if (!client.lobbyDB.has(index)) continue;

        //get the object
        let currentSquad = client.lobbyDB.get(index);

        //if it's not the right one move on
        if (currentSquad.messageID != messageID) continue;

        //if it's right but closed fail early
        if (!currentSquad.open) return null;

        //found it
        return index;
    }
    //didn't find it
    return null;
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

async function getPerms(guild, user, client) {
    let privs = 0;
    let ID = user.id;
    const devUsers = require("../config/devUsers.json");

    if (devUsers.includes(ID)) return 50;

    let member = await guild.fetchMember(user);
    if (!member) return 0;

    //check through each permission level
    for (var perm in client.config.get('perms')) {
        perm = client.config.get('perms')[perm];
        //if this level is better than one we've already confirmed,
        if (perm.privs > privs) {
            //check if the users meets this level
            if (member.roles.some(role=>perm.roles.includes(role.id))) {
                privs = perm.privs;
            }
        }
    };
    return privs;
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