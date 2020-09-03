//If something needs to know the permissions for this command, it looks here
exports.permissions = (client) => {
    return perms = {
        botChannel: false,           //If true, bot only responds in bot channels
        adminBotChannel: false,     //If true, bot only responds in admin bot channels
        role: client.config.get('perms').dev    //Last word specifies permission level needed to use this command
    }
}

const fs = require('fs');

//This code is run when the command is executed
exports.run = async (client, message, args) => {
    let scores = require('../scores.json');

    let badUsers = [];
    for (score of scores) {
        if (score.id) {
            await initialisePlayer(client, score.id);
            let player = client.playerDB.get(score.id);
            player.reputation += score.score;
            client.playerDB.set(score.id, player);
        } else {
            badUsers.push({
                "name": score.name,
                "score": score.score
            })
        }
    }

    fs.writeFile(`./badusers.json`, JSON.stringify(badUsers,null,4), (err) => console.error);

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