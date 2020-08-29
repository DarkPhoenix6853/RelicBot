exports.permissions = (client) => {
    return perms = {
        botChannel: false,
        adminBotChannel: false,
        role: client.config.get('perms').user
    }
}

exports.run = (client, message, args) => {
    const { Client, RichEmbed } = require('discord.js');

    if (client.config.get('channelConfig').recruitChannel != message.channel.id) {
        message.reply("That command is only for the recruiting channel, sorry")
        .then((msg) => {
            msg.delete(10000);
            message.delete(5000);
        });
        return;
    }

    if (args.length == 0) {
        message.reply("Please provide a host message.")
        .then((msg) => {
            msg.delete(10000);
            message.delete(5000);
        });
        return;
    }

    let errorMessage = "";

    let inString = args[0].trim();

    let lowerString = inString.toLowerCase();

    //search for relics
    let matches = regexSearch(lowerString, /((Lith)|(Meso)|(Neo)|(Axi)){1} ?[a-z]{1}[0-9]+/gi)

    let [relicList, sendMessage] = getRelicList(client, lowerString, inString, matches);
    
    let playerList = new Set();
    //if message has some vaulted relics
    if (relicList.size > 0) {
        //get the player list for each relic
        playerList = findPlayers(client, message, relicList);

    } else {
        //send error message about no relics found
        errorMessage += "No vaulted relics found in this message - nobody will be tagged.\n";
    }

    //if we've had non-fatal errors say so
    if (errorMessage != "") {
        const embed = new RichEmbed()
        .setTitle(`Some errors occured:`)
        .setColor(client.config.get('baseConfig').colour)
        .setDescription(errorMessage);

        message.reply(embed)
        .then((msg) => {
            msg.delete(10000);
        });
    }
    let channel = message.channel;
    let authorMember = message.guild.member(message.author);
    //get rid of the original command
    message.delete(500);

    //----------REWORK----------

    let splitMessages = parseMarkers(sendMessage);

    //for each squad, create squad object (including message content), send the message, save the message ID 
    createSquads2(client, authorMember, channel, splitMessages);

    //----------END REWORK----------

    let userArray = Array.from(playerList);

    //mass ping
    let pingMessage = "";
    let newPingMessage = "";
    let currentMention = "";

    //until array of users is empty
    while (userArray.length > 0) {
        //create a mention for the current user
        currentMention = "<@" + userArray.shift() + ">";
        //create a hypothetical new ping message
        newPingMessage = pingMessage + currentMention;

        //if we could send it
        if (newPingMessage.length < 2000) {
            //save it, loop again
            pingMessage = newPingMessage;
        } else {
            //would be too long to send, so send the old version and delete immediately
            channel.send(pingMessage)
            .then(msg => {
                msg.delete();
            })
            .catch();
            //start another one from the missed mention
            pingMessage = currentMention;
        }
    }
    //if there's anyone left
    if (pingMessage.length > 0) {
        //ping and delete
        channel.send(pingMessage)
        .then(msg => {
            msg.delete();
        })
        .catch();
    }
};

async function createSquads2(client, author, channel, splitMessages) {
    const { Client, RichEmbed } = require('discord.js');

    let squadObject = {};

    //for each squad
    for (let currentMessage of splitMessages) {
        currentMessage = currentMessage.trim();

        //find the index of the player count
        let matches = regexSearch(currentMessage, /\b[1-3]\/4/g)
        let matchIndex = matches[0].index;

        let lobbyIndex = client.lobbyDB.get('nextLobby');

        //set to next index
        if (lobbyIndex >= (client.config.get('baseConfig').maxSquads-1)) {
            client.lobbyDB.set('nextLobby', 0);
        } else {
            client.lobbyDB.set('nextLobby', lobbyIndex + 1);
        }
        
        //append the squad ID
        currentMessage += ` {**${lobbyIndex}**}`;

        //currentMessage = author.displayName + " - " + currentMessage;

        //send the message
        const embed = new RichEmbed()
            .setTitle(`Squad ${lobbyIndex} - ${author.displayName}`)
            .setColor(client.config.get('baseConfig').colour)
            .setDescription(currentMessage);
        
        channel.send(embed)
        .then((msg) => {
            //save the message ID
            squadObject = {};
            squadObject.messageID = msg.id;
            squadObject.channel = channel.id;
            squadObject.messageContent = msg.embeds[0].description.substring(0,matchIndex-1);
            
            squadObject.lobbyID = lobbyIndex;
            squadObject.countIndex = matchIndex;
            squadObject.playerCount = parseInt(currentMessage[matchIndex]);
            squadObject.open = true;
            squadObject.hostID = author.id;
            squadObject.joinedIDs = [];

            //store to DB
            client.lobbyDB.set(lobbyIndex, squadObject);
        })
    }

}

function parseMarkers(sendMessage) {
    //Find squad capacity markers
    let matches = regexSearch(sendMessage, /\b[1-3]\/4/g);

    let splitMessages = [];

    if (matches.length == 0) {
        //no squad markers found
        //split by newlines
        splitMessages = sendMessage.split(/\n/g);
        //add squad modifiers
        for (let index in splitMessages) {
            splitMessages[index] += " 1/4";
        }
    } else {
        //markers found, map to all of them
        let splitIndex = matches.map((elem) => {
            return elem.index + 3;
        });
        let lastIndex = 0;
        for (let i = 0; i < splitIndex.length; i++) {
            splitMessages.push(sendMessage.substring(lastIndex, splitIndex[i]));
            lastIndex = splitIndex[i];
        }
    }

    return splitMessages;

    //FUTURE
    //If any 1/4, separate squads by squad markers
    //if some markers but not any 1/4, separate by newline except when squad marker is already used
}

function createSquads(client, message, sendMessage, matches) {
    //create squads
    let squadObject = {};
    let newSendMessage = "";
    let lastCut = 0;

    let keys = [];

    //for each squad found
    for (let i = 0; i < matches.length; i++) {
        //reset squad object
        squadObject = {};

        //get a lobby number for it
        let lobbyIndex = client.lobbyDB.get('nextLobby');

        //set to next index to avoid race conditions
        if (lobbyIndex >= (client.config.get('baseConfig').maxSquads-1)) {
            client.lobbyDB.set('nextLobby', 0);
        } else {
            client.lobbyDB.set('nextLobby', lobbyIndex + 1);
        }

        //put information into new squad object
        squadObject.lobbyID = lobbyIndex;
        //this gets filled later (the message doesn't exist yet)
        squadObject.messageID = "";

        //grab everything from the last squad ID to this marker
        let cutString = sendMessage.substring(lastCut, matches[i].lastIndex);
        newSendMessage += cutString;
        squadObject.messageContent = cutString.trim();
        
        //console.log(`NewSend: '${newSendMessage}'`)

        //save the location of the number to edit later
        squadObject.countIndex = newSendMessage.length-3;
        //console.log(`CountIndex: '${newSendMessage.length-3}'`)

        //insert ID for this new squad
        newSendMessage += ` {**${lobbyIndex}**}`;

        //update the cut location for next loop
        lastCut = matches[i].lastIndex;
        
        //get the starting player count
        squadObject.playerCount = parseInt(matches[i].name.substring(0));
        squadObject.open = true;
        squadObject.hostID = message.author.id;
        squadObject.joinedIDs = [];

        //save the key for this squad to add message ID later
        keys.push(lobbyIndex);

        //save to DB
        client.lobbyDB.set(lobbyIndex, squadObject);
    }

    //add everything after the last squad marker
    newSendMessage += sendMessage.substring(lastCut, sendMessage.length);

    return [keys, newSendMessage];
}

function findPlayers (client, message, relicList) {
    let playerList = new Set();
    //get the player list for each relic
    let currentUsers = [];
    for (let relic of relicList) {

        currentUsers = client.DBEnmap.get(relic);
        for (let user of currentUsers) {
            if (user != message.author.id) {
                playerList.add(user);
            }
        }
    }
    return playerList;
}

function regexSearch(searchString, regex) {
    let currentMatch;
    let result = {};
    let matches = [];

    while((currentMatch = regex.exec(searchString)) !== null) {
        result = {};
        result.name = currentMatch[0];
        result.index = currentMatch.index;
        result.lastIndex = regex.lastIndex;
        matches.push(result);
    }
    return matches;
}

function getRelicList(client, lowerString, inString, matches) {
    let result = null;
    let currentCharacter = 0;
    let relicName = "";
    let spaceIndex = 0;
    //avoids duplicates
    let relicList = new Set();
    let sendMessage = "";

    //iterate through all characters of the message
    for (let index = 0; index < lowerString.length; index++) {
        
        currentCharacter = index;

        //check if any results start here
        result = null;
        for (let i = 0; i < matches.length; i++) {
            if (matches[i].index == index) {
                
                result = matches[i];
            }
        }

        if (result != null) {
            //a result starts here
            //check if the result has a space in the name or not, add it if it's missing
            if (result.name.startsWith('lith') || result.name.startsWith('meso')) {
                spaceIndex = 4;
            } else {
                spaceIndex = 3;
            }

            if (result.name[spaceIndex] == ' ') {
                relicName = result.name;
            } else {
                relicName = result.name.substring(0,spaceIndex) + " " + result.name.substring(spaceIndex, result.name.length);
            }
            
            //capitalise properly
            relicName = relicName
                .toLowerCase()
                .split(' ')
                .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
                .join(' ');

            //check if relic in DB
            if (client.DBEnmap.indexes.includes(relicName)) {

                //add to list of relics
                relicList.add(relicName);

                //format it into the message
                sendMessage += "__";
                sendMessage += relicName;
                sendMessage += "__";

                //skip to the end of the result (so we don't print it out twice)
                index = result.lastIndex - 1;
            }
        }
        
        
        //if we haven't found anything, just print the current character
        if (currentCharacter == index) {
            sendMessage += inString[index];
        }
    }
    return [relicList, sendMessage];
}

exports.help = (client, message) => {
    const { Client, RichEmbed } = require('discord.js');
    
    const helpMessage = `Creates a hosting message using all text supplied after the command. 

Relic names will be found and highlighted, and people subscribed to those relics will be notified. 

Squad identifiers (1/4, 2/4, 3/4) will have lobby ID's inserted after them. Use ${client.config.get('baseConfig').prefix}join <lobbyID> on one of these identifying numbers to join that squad.

Get a full user's guide by using ${client.config.get('baseConfig').prefix}guide in a bot channel

Example usage: ${client.config.get('baseConfig').prefix}create h axi a1 1/4 and stuff

You can also use __${client.config.get('baseConfig').prefix}c__, __${client.config.get('baseConfig').prefix}host__ or __${client.config.get('baseConfig').prefix}h__ if you prefer. `;

    const embed = new RichEmbed()
    .setTitle('Help for Create')
    .setColor(client.config.get('baseConfig').colour)
    .setDescription(helpMessage);

    message.channel.send(embed);
};