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
exports.run = (client, message, args) => {
    let scores = require('../score_import.json');

    for (score of scores) {
        let user = client.users.find(user => user.username == score.name);
        if (user) {
            score.id = user.id;
        } else {
            score.id = null;
        }
    }

    fs.writeFile(`./scores.json`, JSON.stringify(scores,null,4), (err) => console.error);

};