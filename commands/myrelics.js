//If something needs to know the permissions for this command, it looks here
exports.permissions = (client) => {
    return perms = {
        botChannel: true,           //If true, bot only responds in bot channels
        adminBotChannel: false,     //If true, bot only responds in admin bot channels
        role: client.config.get('perms').user     //Last word specifies permission level needed to use this command
    }
}

//This code is run when the command is executed
exports.run = (client, message, args) => {
    const { Client, RichEmbed } = require('discord.js');

    let relics = client.DBEnmap.indexes;
    let myRelics = [];

    //for each relic name
    for (let i = 0; i < relics.length; i++) {
        //see if user is subscribed
        if(client.DBEnmap.get(relics[i]).includes(message.author.id)) {
            myRelics.push(relics[i]);
        }
    }

    let sendMessage;
    //if there are any relics, 
    if (myRelics.length > 0) {
        //see "listrelics"
        sendMessage = `List of your relics:\n`;

        //-----
        let lithRelics = [];
        let mesoRelics = [];
        let neoRelics = [];
        let axiRelics = [];

        let first3 = "";
        let first4 = "";

        for (let i = 0; i < myRelics.length; i++) {
            first3 = myRelics[i].substring(0,3);
            first4 = myRelics[i].substring(0,4);

            if (first4 == 'Lith') {
                lithRelics.push(myRelics[i].substring(5,myRelics[i].length));
            } else if (first4 == 'Meso') {
                mesoRelics.push(myRelics[i].substring(5,myRelics[i].length));
            } else if (first3 == 'Neo') {
                neoRelics.push(myRelics[i].substring(4,myRelics[i].length));
            } else if (first3 == 'Axi') {
                axiRelics.push(myRelics[i].substring(4,myRelics[i].length));
            }
        }

        if (lithRelics.length > 0) {
            sendMessage += `Lith:\n`;
        }
        for (let i = 0; i < lithRelics.length; i++) {
            if (i != lithRelics.length - 1) {
                sendMessage += `${lithRelics[i]}, `;
            } else {
                sendMessage += `${lithRelics[i]}\n\n`;
            }
        }
    
        if (mesoRelics.length > 0) {
            sendMessage += `Meso:\n`;
        }
        for (let i = 0; i < mesoRelics.length; i++) {
            if (i != mesoRelics.length - 1) {
                sendMessage += `${mesoRelics[i]}, `;
            } else {
                sendMessage += `${mesoRelics[i]}\n\n`;
            }
        }
    
        if (neoRelics.length > 0) {
            sendMessage += `Neo:\n`;
        }
        for (let i = 0; i < neoRelics.length; i++) {
            if (i != neoRelics.length - 1) {
                sendMessage += `${neoRelics[i]}, `;
            } else {
                sendMessage += `${neoRelics[i]}\n\n`;
            }
        }
    
        if (axiRelics.length > 0) {
            sendMessage += `Axi:\n`;
        }
        for (let i = 0; i < axiRelics.length; i++) {
            if (i != axiRelics.length - 1) {
                sendMessage += `${axiRelics[i]}, `;
            } else {
                sendMessage += `${axiRelics[i]}\n\n`;
            }
        }
        //------

    } else {
        //no relics subscribed
        sendMessage = "Didn't find any relics";
    }

    const embed = new RichEmbed()
    .setTitle('MyRelics')
    .setColor(client.config.get('baseConfig').colour)
    .setDescription(sendMessage);

    message.channel.send(embed);
};

//This code is run when the help command is used to get info about this command
exports.help = (client, message) => {
    const { Client, RichEmbed } = require('discord.js');
    
    const helpMessage = `Lists the relics you are subscribed to.   

Usage: ${client.config.get('baseConfig').prefix}MyRelics`;

    const embed = new RichEmbed()
    .setTitle('Help for MyRelics')
    .setColor(client.config.get('baseConfig').colour)
    .setDescription(helpMessage);

    message.channel.send(embed);
};

