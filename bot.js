//
// todo:
// slash commands? or mentions?
// - help - list commands and their descriptions
// - invite - DM the user with an invite? or post as a response
// light database to store catchfixes per server
// - catchfix - sets the server's catchfix

const {token, HOMEGUILD, HOMECATCHFIX, GLOBALPREFIX, HINTSTART, INVITEURL, POKETWO_ID, DEBUG} = require("./config.json");
const {POKEMONLIST} = require("./pokemon.json")

const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES] });

const KeyvRedis = require('@keyv/redis');
const Keyv = require('keyv');
const keyvRedis = new KeyvRedis('redis://user:pass@localhost:6379', namespace: 'prefix');
const keyvRedisc = new KeyvRedis('redis://user:pass@localhost:6379', namespace:'catchfixes');
const prefixes = new Keyv({ store: keyvRedis });
const catchfixes = new Keyv({ store: keyvRedisc });

const underscore = /(\\_|_)/g

client.on('messageCreate', async message => {
	if ( message.author.id == POKETWO_ID || DEBUG) {
		if ( message.content.startsWith(HINTSTART) ) {
			var texts = check(message.content.substring(15,message.content.length-1),message.guild.id)
			texts.forEach(text => {message.channel.send(text)})
			}
		}
	let args;
	if (message.guild) {
		let prefix;
		if (message.content.startsWith(GLOBALPREFIX)) {
			prefix = GLOBALPREFIX;
		} else {
			const guildPrefix = await prefixes.get(message.guild.id);
			if (message.content.startsWith(guildPrefix)) prefix = guildPrefix;
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
		message.channel.send(`The bot will automatically respond to poketwo's messages that start with the hint message ("The pokémon is" by default).\n
Commands: help, invite, ping, solve\n
Source: <https://github.com/Tsunder/pokecord-hint-solver>`)
	} else if (command === "invite") {
		message.channel.send("Invite me to your server!\n" +
			INVITEURL)
	} else if (command === "solve") {
		//no args, define the command
		if (args.length == 0) {
			message.channel.send("Enter a hint to resolve!")
			return;
		}
		var texts = check(args.join(" "), message.guild.id)
		texts.forEach(text => {message.channel.send(text)})
	} else if (command === "prefix") {
		if (args.length) {
			await prefixes.set(message.guild.id, args[0]);
			return message.channel.send(`Successfully set prefix to \`${args[0]}\``);
		}
		return message.channel.send(`Prefix is \`${await prefixes.get(message.guild.id) || GLOBALPREFIX}\``);

	} else if (command === "catchfix") {
		if (args.length) {
			await catchfixes.set(message.guild.id, args[0]);
			return message.channel.send(`Successfully set catchfix to \`${args[0]}\``);
		}
		return message.channel.send(`Catchfix is \`${await catchfixes.get(message.guild.id) || GLOBALCATCHFIX}\``);

	}
});

client.once( 'ready', () => {
	console.log("poke hint solver bot ready");
});

//returns an array of strings that potentially match the hint provided
function check (texto,guildId) {
	// limit the text to only as long as the longest pokemon name we have
	// and convert to lowercase
	texto = texto.substring(0,POKEMONLIST.length-1).toLowerCase();
	//replacing _ for regex
	var text = texto.replace(underscore,".")
	var reg = new RegExp(text)
	var validmons = POKEMONLIST[text.length].filter((mon) => {return mon.match(reg)})
	if (validmons.length == 0) {
		if (text.length > 14) {
			text = texto.substr(texto.lastIndexOf(" ")+1)
		}
		reg = new RegExp(text.replace(underscore,"."))
		validmons = POKEMONLIST[text.length].filter((mon) => {return mon.match(reg)})
		if (validmons.length == 0) {
			text = text.substring(0,text.length-1);
			reg = new RegExp(text.replace(underscore,"."))
			validmons = POKEMONLIST[text.length].filter((mon) => {return mon.match(reg)})
		}
	}
	
	var response = []
	if (validmons.length == 0) {
		response.push("No matches found!")
		console.log(`No matches found for: ${texto}`)
		return response
	}

	//catch prefix, eventually will be dynamic
	var joiner = guildId == HOMEGUILD ? `${HOMECATCHFIX} `:``;
	var out = validmons.slice(0,4)

	out.forEach(line => {response.push(`${joiner}${toTitleCase(line)}`)})
	if (validmons.length > 4) {
		response.push(`Showing first 4/${validmons.length} matches.`)
	}
	if (response.length == 0) {
		response.push("Error'd really badly.")
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

client.login(token)