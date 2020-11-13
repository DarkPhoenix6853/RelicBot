exports.onMessage = (client, message) => {
    //triggers on every non-bot message
    if (message.isMemberMentioned(client.user)) {
        //if someone @'s the bot
        const botChannels = client.config.get('channelConfig').botChannels;

        if ((message.content.includes("help")) ) {
            //if user @'s the bot in a bot channel, or @'s them with "help" in any channel
            message.reply(`Use __${client.config.get('baseConfig').prefix}guide__ or __${client.config.get('baseConfig').prefix}help__ in the bot channel to learn how to use this bot.`);
    
        } else if ( message.content.includes("core")) {
            //if a user @'s the bot with "core"
            message.reply(`Current core: ${client.config.get('identity').name} with prefix: ${client.config.get('baseConfig').prefix}`);
    
        } else if (message.content.includes("prefix")) {
            //if a user @'s the bot asking for prefix
            message.reply(`Current prefix: ${client.config.get('baseConfig').prefix}`);

        } else if (message.content.includes("hi")) {
            //if they're just saying hi
            message.channel.send(`Hi, ${message.author}`)


        } else if (botChannels.includes(message.channel.id)) {
            //if they're @'ing the bot in a bot channel but aren't using any of its predefined responses
            message.reply(`Use __${client.config.get('baseConfig').prefix}guide__ or __${client.config.get('baseConfig').prefix}help__ in the bot channel to learn how to use this bot.`);
        }
    }
    
}

exports.commandHandler = (client, message) => {

    if (message.channel.type == "dm" || message.channel.type == "group") return;

    let logChannel = client.channels.find(channel => channel.id === client.config.get('channelConfig').logChannel);

    let channel = "";

    if (message.channel.id == client.config.get('channelConfig').recruitChannel) {
        channel = "Recruit";
    } else if (message.channel.id == client.config.get('channelConfig').logChannel) {
        channel = "Log";
    } else if (client.config.get('channelConfig').botChannels.includes(message.channel.id)) {
        channel = "Bot";
    } else if (client.config.get('channelConfig').adminBotChannels.includes(message.channel.id)) {
        channel = "Admin";
    } else {
        channel = "Other - somehow";
    }

    message.guild.fetchMember(message)
    .then((member) => {
        logChannel.send(`__${member.displayName}__ in ${channel}: ${message.content}`);
    })
    .catch(() => {
        console.log('Caught in Message event - sending to log channel')
    })
    //logChannel.send(`${message.guild.fetchMember(message).displayName}: ${message.content}`);


    //have already checked for the prefix

    //cut off the prefix, shift to lowercase for this search
    let messageContent = message.content.slice(2).toLowerCase().trim();
    let regex = /((create)|(host)|(c)|(h))[, \n]+/;
    let firstResult = regex.exec(messageContent);

    let args = []

    //split into arguments based on whether the command is create or not
    if (firstResult && firstResult.index === 0) {
        //create, only split around first space/comma/newline
        args = [];
        args.push("create");
        args.push(message.content.slice(client.config.get('baseConfig').prefix.length+firstResult[0].length).trim());
    } else {
        //not, split by spaces or commas
        args = message.content.slice(client.config.get('baseConfig').prefix.length).trim().split(/[, ]+/g);
    }
    
    //pop the command off, shift the rest of the args over
    let command = args.shift().toLowerCase();

    //aliases
    switch (command) {
        case "h":
        case "c":
        case "host":
            command = "create";
            break;
        case "j":
        case "y":
            command = "join";
            break;
        case "l": 
            command = "leave";
            break;
        case "addrelics":
            command = "addrelic";
            break;
        case "createrelics":
            command = "createrelic";
            break;
        case "deleterelics":
            command = "deleterelic";
            break;
        case "removeplayers":
            command = "removeplayer";
            break;
        case "removerelics":
            command = "removerelic";
            break;
        case "addplayers":
            command = "addplayer";
            break;
    }

    // Grab the command data from the client.commands Enmap
    let cmd = client.commands.get(command);

    //check if the command exists
    if (!cmd) {        
        let channelID = message.channel.id;

        message.channel.send("Command not found, or you didn't put a space between the command and its information")
        .then((msg) => {
            if (client.config.get('channelConfig').recruitChannel == channelID) {
                msg.delete(10000)
                .catch(() => {
                    console.log('Caught in Message event - Command not found - msg')
                });

                message.delete(5000)
                .catch(() => {
                    console.log('Caught in Message event - Command not found - message')
                });
            }            
        });
        
        return;
        
    }
    //check if the command has a "run" function
    if (!cmd.run) {
        message.channel.send("Command exists but is not coded properly - contact the devs");
        return;
    }
    //check if the command has permissions
    if (!cmd.permissions) {
        message.channel.send('Something\'s wrong with the command permissions');
        return;
    }

    //get the permissions config
    const perms = cmd.permissions(client);
    //see if this command must be used in bot channels
    const botChannel = perms.botChannel;
    const adminBotChannel = perms.adminBotChannel;
    //get a list of bot channels on the server
    const botChannels = client.config.get('channelConfig').botChannels;
    const adminBotChannels = client.config.get('channelConfig').adminBotChannels;

    //Check if this command is allowed here
    //otherwise make sure we're in any bot channel
    if (botChannel && !botChannels.includes(message.channel.id) && !adminBotChannels.includes(message.channel.id)) {
        message.reply('You must use this in a bot channel.')
        .then((msg) => {
            message.delete();
            msg.delete(5000);
        })
        .catch(() => {
            console.log('Caught in Message event - You must use this in a bot channel')
        });
        return;
    }

    //calculate the user's privs
    const commandPrivs = perms.role.privs;
    const GetUserPrivs = require('../lib/getUserPrivs');
    const userPrivs = GetUserPrivs.run(message, client);
    //compare to command
    if (userPrivs < commandPrivs) {
        message.channel.send(`Sorry, you don't have permission to use this command. You need at least a ${perms.role.name}-level role to use ${command}` );
        return;
    } else {
        const devUsers = require("../config/devUsers.json");
        //if it needs an admin channel, make sure we're in an admin channel
        if (adminBotChannel && !adminBotChannels.includes(message.channel.id) && !devUsers.includes(message.author.id)) {
            message.reply('Use the admin channel for that command')
            .then((msg) => {
                message.delete();
                msg.delete(5000);
            })
            .catch(() => {
                console.log('Caught in Message event - use admin channel')
            });
            return;
        }

        //console.log(`Command: ${command}, Args: '${args.join("', '")}'`)
        cmd.run(client, message, args);
    }
};