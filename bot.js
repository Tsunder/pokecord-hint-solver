//
// todo:
// a. "sharding" refactor
// b. make it work in DMs

const {token, GLOBALPREFIX, HINTSTART, INVITEURL, POKETWO_ID, DEBUG} = require("./config.json");
const {POKEMONLIST} = require("./pokemon.json")

const { Client, Intents, Permissions } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES] });

const Keyv = require('keyv');
const database = new Keyv('sqlite://./database.sqlite');

const MAXGUILDS = 1000;

var guildList = []

//maybe just make this "everythin gnot alphanumeric + space?"
const specialchars = /(\\_|_|\*|\\\*|\^|\?)/g
//this whole method seems inefficient
client.on('messageCreate', async message => {
	if (message.guild && !(message.channel.permissionsFor(message.guild.me).has("SEND_MESSAGES"))) {
		return;
	}
	if (message.author.bot) {
		if ( message.author.id == POKETWO_ID) {
			if ( message.content.startsWith(HINTSTART) ) {
				var respond = await database.get(`${message.guild.id}hauto`) || 1
				if (respond == -1) {return;}
				var catchfix = await database.get(`${message.guild.id}cauto`) || 1
				if ( catchfix === -1 ) {catchfix = ""} else { catchfix = await database.get(`${message.guild.id}c` || "") }
				var texts = check(message.content.toLowerCase().substring(15,message.content.length-1),catchfix, false, respond == 2)
				texts.forEach(text => {sendMessage(message.channel,text)})
				return;
			}
		}
		return;
	}
	let args;
	if (message.guild) {
		let prefix;
	//alternatively do localecompare sensitivity: base
		var messageText = message.content.toLowerCase();
		if (messageText.startsWith(GLOBALPREFIX)) {
			prefix = GLOBALPREFIX;
		} else {
			const guildPrefix = await database.get(`${message.guild.id}p`);
			if (messageText.startsWith(guildPrefix)) { prefix = guildPrefix }
			else if (messageText.startsWith(`<@!${client.user.id}>`) || messageText.startsWith(`<@${client.user.id}>`)) { prefix = `<@!${client.user.id}>`}
		}
		if (!prefix) return;
		args = messageText.slice(prefix.length).trim().split(/\s+/);
	} else {
		const slice = message.content.toLowerCase().startsWith(GLOBALPREFIX) ? GLOBALPREFIX.length : 0;
		args = message.content.toLowerCase().slice(slice).split(/\s+/);
	}

	const command = args.shift();
	if(command === "ping")	{
		sendMessage(message.channel,`${client.ws.ping}ms.`);
		console.log(`pinged! ${client.ws.ping}ms`);
	} else if (command === "help") {
		sendMessage(message.channel,`The bot will automatically respond to poketwo's hint messages.\n
Commands: \`\`\`help, info, invite, \ncatchfix, prefix, togglecatchfix, togglehint, \nping, solve, list\`\`\``
)
	} else if (command === "info") {
		sendMessage(message.channel,`Currently serving ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)} trainers in ${client.guilds.cache.size} regions.\n
Source: <https://github.com/Tsunder/pokecord-hint-solver>`)
	} else if (command === "invite") {
		guildlimitwarning();
		if(client.guilds.size > MAXGUILDS) {
			message.author.send(`Sorry, I've reached my current maximum number of servers.`).catch(errorCatch)
			sendMessage(message.channel,`I've sent you a direct message!`)
			return
		}
		message.author.send(`Invite me to your server!\n${INVITEURL}`).catch(errorCatch)
		sendMessage(message.channel,`I've sent you a direct message!`)
	} else if (command === "solve") {
		// lists first several matching pokemon
		if (args.length == 0) {
			sendMessage(message.channel,"Enter a hint to resolve!")
			return;
		}
		var texts = check(args.join(" "))
		texts.forEach(text => {sendMessage(message.channel,text)})
		return;
	} else if (command === "list") {
		// list all matching pokemon to the hint
		if (args.length == 0) {
			sendMessage(message.channel,"Enter a hint to list all matching pokemon.")
			return;
		}
		var texts = check(args.join(" "),"", true)
		texts.forEach(text => {sendMessage(message.channel,text)})
		return;
	} else if (command === "prefix") {
		//command prefix
		if (args.length) {
			if(!isModerator(message.member)) {
				return sendMessage(message.channel,`I'm sorry, ${message.author}. I'm afraid I can't do that.`)
			}
			await database.set(`${message.guild.id}p`, args[0]);
			return sendMessage(message.channel,`Successfully set prefix to \`${args[0]}\``);
		}
		let prefix = await database.get(`${message.guild.id}p`) || GLOBALPREFIX;
		return sendMessage(message.channel,`Prefix is \`${prefix}\`\nUse \`${prefix}prefix NewPrefix\` to set a new one.`);

	} else if (command === "catchfix") {
		// prepend hint response with the .catch of the server
		if (args.length) {
			if(!isModerator(message.member)) {
				return sendMessage(message.channel,`I'm sorry, ${message.author}. I'm afraid I can't do that.`)
			}
			await database.set(`${message.guild.id}c`, args[0]);
			return sendMessage(message.channel,`Successfully set catchfix to \`${args[0]}\``);
		}
		return sendMessage(message.channel,`Catchfix is \`${await database.get(`${message.guild.id}c`) || "none"}\`\nUse \`${await database.get(`${message.guild.id}p`) || GLOBALPREFIX}catchfix NewCatchfix\` to set a new one.`);
	} else if ( command === `togglehint`) {
		// Automatic hint responding
		if (args.length) {
			if (!isModerator(message.member)) { return sendMessage(message.channel,`I'm sorry, ${message.author}. I'm afraid I can't do that.`) }
			if (args[0] === "on") {
				await database.set(`${message.guild.id}hauto`, 1);
				return sendMessage(message.channel,`Successfully set hint message responding to: \`ON\` ✅`);
			} else if (args[0] === "off") {
				await database.set(`${message.guild.id}hauto`, -1);
				return sendMessage(message.channel,`Successfully set hint message responding to: \`OFF\` ❎`);
			} else if (args[0] === "spoiler") {
				await database.set(`${message.guild.id}hauto`, 2);
				return sendMessage(message.channel,`Successfully set hint message responding to: \`SPOILERED\` ✅`);
			}
		}
		var hauto = await database.get(`${message.guild.id}hauto`) || 1
		var status = hauto === -1 ? "`OFF`❎" : hauto == 1 ? "`ON`✅" : "`SPOILERED`✅"
		return sendMessage(message.channel,`Automatic hint message responding is currently: ${status}\nUse \`${await database.get(`${message.guild.id}p`) || GLOBALPREFIX}togglehint on/off/spoiler\` to change.`)
	} else if ( command === `togglecatchfix`) {
		if (args.length) {
			if (!isModerator(message.member)) { return sendMessage(message.channel,`I'm sorry, ${message.author}. I'm afraid I can't do that.`) }
			if (args[0].trim() === "on") {
				await database.set(`${message.guild.id}cauto`, 1);
				return sendMessage(message.channel,`Successfully set catchfix prepending to: \`ON\` ✅`);
			} else if (args[0].trim() === "off") {
				await database.set(`${message.guild.id}cauto`, -1);
				return sendMessage(message.channel,`Successfully set catchfix prepending to: \`OFF\` ❎`);
			}
		}
		var cauto = await database.get(`${message.guild.id}cauto`)
		return sendMessage(message.channel,`Catchfix prepending is currently: ${cauto === -1 ? "`OFF`❎" : "`ON` ✅"}\nUse \`${await database.get(`${message.guild.id}p`) || GLOBALPREFIX}togglecatchfix on/off\` to change.`)
	}
});

client.on('guildDelete', async guild => {removeGuild(guild.id)});
async function removeGuild(guildID) {
	console.log("Now leaving guild: " + guildID)	

	await database.delete(`${guildID}p`);
	await database.delete(`${guildID}c`);
	await database.delete(`${guildID}hauto`);
	await database.delete(`${guildID}cauto`);
	guildList.splice(guildList.indexOf(guildID),1);
	await database.set('guildList', guildList)
}

client.on('guildCreate', async guild => {addGuild(guild.id)});

async function addGuild (guildID) {
	console.log(`adding guild ${guildID}`)
	guildList.push(guildID);
	await database.set('guildList', guildList)
	//await database.set(`${guild.id}p`, GLOBALPREFIX);
	//await database.set(`${guild.id}c`, "");
	//await database.set(`${guild.id}hauto`,1);
	//await database.set(`${guild.id}cauto`,1);
}
client.once( 'ready', async () => {
	console.log("poke hint solver bot ready");
	console.log(`Currently serving ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)} trainers in ${client.guilds.cache.size} regions.\n
Source: <https://github.com/Tsunder/pokecord-hint-solver>`)
	await refreshGuildsDatabase()
	guildlimitwarning()
});



async function refreshGuildsDatabase () {
	guildList = await database.get("guildList") || []
	//updates guilds for when the bot joined/was kicked while offline
	//gets the last known list of guilds the bot was in (array parse)
	//gets a list of guilds the bot is CURRENTLY in
	//first go through all guilds the bot was known to be in
	//if the bot is in new guilds, then remove it from new guilds
	//otherwise, remove it and its data from settings
	//go through remaining list of guilds the bot is currently in, these are all new guilds
	//add bot to guilds
	var newGuilds = client.guilds.cache.map(guild => guild.id) // does this even work
	//newGuilds.push(123) //test guild IDs
	var oldGuilds = await database.get(`guildList`) || []
	//oldGuilds.push(321) //test guild IDs
	oldGuilds.forEach(async oldID => {
		if (newGuilds.indexOf(oldID) > -1) {
			newGuilds.splice(newGuilds.indexOf(oldID),1)
		} else {
			console.log(`No longer in guild ${oldID}, removing...`)
			await removeGuild(oldID)
		}
	})
	//all that's left are new guilds
	newGuilds.forEach(guild => {guildList.push(guild); console.log(`New guild: ${guild}`)})
	await database.set('guildList', guildList)

}

function guildlimitwarning(){
	if (client.guilds.cache.size > 95) {
			console.log(`Warning, bot is in ${client.guilds.cache.size} servers!`)
		}
}



//returns an array of strings that potentially match the hint provided
function  check (texto,catchfix,chunk, spoiler) {
	// limit the text to only as long as the longest pokemon name we have
	// and convert to lowercase
	//texto = texto.substring(0,POKEMONLIST.length-1).toLowerCase();
	//replacing _ for regex
	if (texto.length > 50) {
		return ["Hint too long"]
	}
	var text = texto.replace(specialchars,".").substring(0,POKEMONLIST.length-1).trim();
	if (!POKEMONLIST[text.length].length) {
		console.log(`No matches found for: "${texto}"`)
		return ["No matches found!"]
	}
	/* we'll define gender another day, for now, let's just put that weird text where it belongs.
	let gender = text.search(/♀️|♂️/)
	if (gender > 0) {
		text = text.substr(0, gender)
	}
	*/

	var reg = new RegExp(text)
	var validmons = POKEMONLIST[text.length].filter((mon) => {return mon.match(reg)})
	if (validmons.length == 0) {
		console.log(`No basic matches for ${texto} @ length ${text.length}, removing last character...`)
		reg = new RegExp(text.substring(0,text.length-1))
		validmons = POKEMONLIST[text.length-1].filter((mon) => {return mon.match(reg)})
		if (validmons.length == 0) {
			console.log("still no matches...")
			text = text.substr(text.lastIndexOf(" ")+1)
			reg = new RegExp(text)
			validmons = POKEMONLIST[text.length].filter((mon) => {return mon.match(reg)})
		}
	}


	if (chunk) {
		// this is a bad way to do it.
		// please fix
		chunk = validmons.join(", ")
		return chunk.length>1950 ? [`${chunk.substring(0,1950)} and more...`] : [chunk]
	}
	if (validmons.length == 0) {
		console.log(`No matches found for: "${texto}"`)
		return ["No matches found!"]
	}

	var response = []

	var out = validmons.slice(0,4)
	if (spoiler) {
		out.forEach(line => {response.push(`\|\|${catchfix||""} ${toTitleCase(line)}\|\|`)})
	}
	else {
		out.forEach(line => {response.push(`${catchfix||""} ${toTitleCase(line)}`)})
	}
	if (validmons.length > 4) {
		response.push(`Showing first 4/${validmons.length} matches.`)
	}

	return response
}


function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}

function isModerator(member) {
	var isModerator = false
	var permlist = [
		Permissions.FLAGS.ADMINISTRATOR,
		Permissions.FLAGS.MANAGE_CHANNELS,
		Permissions.FLAGS.MANAGE_MESSAGES
		]
		permlist.forEach(perm => {
			if(member.permissions.has(perm)) {
				isModerator = true;
				return
			}
		})
	return isModerator
}

function sendMessage(channel,payload) {
	channel.send(payload).catch(errorCatch)
}

function errorCatch(error) {
		console.error('Error: ', error)
	}

client.login(token)
