exports.onRemove = (client, reaction, user) => {
    if (reaction.emoji.name == '✅') attemptJoin(client, reaction, user);
}

exports.onAddition = (client, reaction, user) => {
    if (reaction.emoji.name == '✅') attemptLeave(client, reaction, user);
    if (reaction.emoji.name == '❎') attemptClose(client, reaction, user);
}

function attemptJoin(client, reaction, user) {
    if (reaction.emoji.name != '✅') return;

    let squadID = findSquad(client, reaction.message.id);

    if (!squadID) return;

    //check that player isn't in the squad, or is the host
    let currentSquad = client.lobbyDB.get(squadID);
    if (currentSquad.hostID == user.id) return;
    if (currentSquad.joinedIDs.includes(user.id)) return;

    //they aren't, add them
    console.log(`Add ${user.username}`);
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
    console.log(`Remove ${user.username}`);
}

function attemptClose(client, reaction, user) {
    //check if it's the right reaction
    if (reaction.emoji.name != '❎') return;
    //check if it's on a message we care about
    let squadID = findSquad(client, reaction.message.id);
    if (!squadID) return;

    //check if player is the host
    let currentSquad = client.lobbyDB.get(squadID);
    if (currentSquad.hostID != user.id) return;

    //they are the host, close it
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