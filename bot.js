//
// todo:
// slash commands? or mentions?
// - help - list commands and their descriptions
// - invite - DM the user with an invite? or post as a response
// light database to store catchfixes per server
// - catchfix - sets the server's catchfix

const {token, GLOBALPREFIX, HINTSTART, INVITEURL, POKETWO_ID, DEBUG} = require("./config.json");
const {POKEMONLIST} = require("./pokemon.json")

const { Client, Intents, Permissions } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES] });

const Keyv = require('keyv');
const database = new Keyv('sqlite://./database.sqlite');

const underscore = /(\\_|_)/g

client.on('messageCreate', async message => {
	if ( message.author.id == POKETWO_ID || DEBUG) {
		if ( message.content.startsWith(HINTSTART) ) {
			var respond = await database.get(`${message.guild.id}hauto`) || -1
			if (respond == -1) {return;}

			var catchfix = await database.get(`${message.guild.id}c`) || ""
			var texts = check(message.content.substring(15,message.content.length-1),catchfix)
			texts.forEach(text => {message.channel.send(text)})
			return;
			}
		}
	let args;
	if (message.guild) {
		let prefix;
		if (message.content.startsWith(GLOBALPREFIX)) {
			prefix = GLOBALPREFIX;
		} else {
			const guildPrefix = await database.get(`${message.guild.id}p`);
			if (message.content.startsWith(guildPrefix)) { prefix = guildPrefix }
				else if (message.content.startsWith(`<@!${client.user.id}>`)) { prefix = `<@!${client.user.id}>`}
		}
		if (!prefix) return;
		args = message.content.slice(prefix.length).trim().split(/\s+/);
	} else {
		const slice = message.content.startsWith(GLOBALPREFIX) ? GLOBALPREFIX.length : 0;
		args = message.content.slice(slice).split(/\s+/);
	}

	const command = args.shift().toLowerCase();
	if(command === "ping")	{
		message.channel.send(`${client.ws.ping}ms.`);
		console.log(`pinged! ${client.ws.ping}ms`);
	} else if (command === "help") {
		message.channel.send(`The bot will automatically respond to poketwo's hint messages.\n
Commands: help, invite, ping, solve, list, catchfix, prefix, togglehint\n
Source: <https://github.com/Tsunder/pokecord-hint-solver>`)
	} else if (command === "invite") {
		message.channel.send("Invite me to your server!\n" +
			INVITEURL)
	} else if (command === "solve") {
		// lists first several matching pokemon
		if (args.length == 0) {
			message.channel.send("Enter a hint to resolve!")
			return;
		}
		var texts = check(args.join(" "))
		texts.forEach(text => {message.channel.send(text)})
		return;
	} else if (command === "list") {
		// list all matching pokemon to the hint
		if (args.length == 0) {
			message.channel.send("Enter a hint to list all matching pokemon.")
			return;
		}
		var texts = check(args.join(" "),"", true)
		texts.forEach(text => {message.channel.send(text)})
		return;
	} else if (command === "prefix") {
		//command prefix
		if (args.length) {
			if(!isModerator(message.member)) {
				return message.channel.send(`I'm sorry, ${message.author}. I'm afraid I can't do that.`)
			}
			await database.set(`${message.guild.id}p`, args[0]);
			return message.channel.send(`Successfully set prefix to \`${args[0]}\``);
		}
		let prefix = await database.get(`${message.guild.id}p`) || GLOBALPREFIX;
		return message.channel.send(`Prefix is \`${prefix}\`\nUse \`${prefix}prefix NewPrefix\` to set a new one.`);

	} else if (command === "catchfix") {
		// prepend hint response with the .catch of the server
		if (args.length) {
			if(!isModerator(message.member)) {
				return message.channel.send(`I'm sorry, ${message.author}. I'm afraid I can't do that.`)
			}
			if (args[0] === "----") { args[0] = "" }
			await database.set(`${message.guild.id}c`, args[0]);
			return message.channel.send(`Successfully set catchfix to \`${args[0]||"none"}\``);
		}
		return message.channel.send(`Catchfix is \`${await database.get(`${message.guild.id}c`) || "none"}\`\nUse \`${await database.get(`${message.guild.id}p`) || GLOBALPREFIX}catchfix NewCatchfix\` to set a new one, or \`----\` to remove.`);
	} else if ( command === `togglehint`) {
		// Automatic hint responding
		if (!isModerator(message.member)) { return message.channel.send(`I'm sorry, ${message.author}. I'm afraid I can't do that.`) }
		if (args.length) {
			if (args[0] === "on") {
				await database.set(`${message.guild.id}hauto`, 1);
				return message.channel.send(`Successfully set automatic hint responding to: \`ON\` ✅`);
			} else if (args[0] === "off") {
				await database.set(`${message.guild.id}hauto`, -1);
				return message.channel.send(`Successfully set automatic responding to: \`OFF\` ❎`);
			}
		}
		var hauto = await database.get(`${message.guild.id}hauto`)
		return message.channel.send(`Automatic hint responding is currently: ${hauto === 0 ? "`OFF`❎" : "`ON` ✅"}\nUse \`${await database.get(`${message.guild.id}p`) || GLOBALPREFIX}togglehint on/off\` to change.`)

	}

});

client.once( 'ready', () => {
	console.log("poke hint solver bot ready");
});

//returns an array of strings that potentially match the hint provided
function  check (texto,catchfix,chunk) {
	// limit the text to only as long as the longest pokemon name we have
	// and convert to lowercase
	//texto = texto.substring(0,POKEMONLIST.length-1).toLowerCase();
	//replacing _ for regex
	if (texto.length > 50) {
		return ["Hint too long"]
	}
	var text = texto.replace(underscore,".").substring(0,POKEMONLIST.length-1).toLowerCase();
	if (!POKEMONLIST[text.length].length) {
		console.log(`No matches found for: ${texto}`)
		return ["No matches found!"]
	}
	var reg = new RegExp(text)
	var validmons = POKEMONLIST[text.length].filter((mon) => {return mon.match(reg)})
	if (validmons.length == 0) {
		text = text.substr(text.lastIndexOf(" ")+1)
		reg = new RegExp(text)
		validmons = POKEMONLIST[text.length].filter((mon) => {return mon.match(reg)})
		if (validmons.length == 0) {
			text = text.substring(0,text.length-1)
			reg = new RegExp(text)
			validmons = POKEMONLIST[text.length].filter((mon) => {return mon.match(reg)})
		}
	}


	if (chunk) {
		chunk = validmons.join(", ")
		return chunk.length>1950 ? [`${chunk.substring(0,1950)} and more...`] : [chunk]
	}
	if (validmons.length == 0) {
		console.log(`No matches found for: ${texto}`)
		return ["No matches found!"]
	}

	var response = []

	var out = validmons.slice(0,4)

	out.forEach(line => {response.push(`${catchfix||""} ${toTitleCase(line)}`)})
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

client.login(token)
