// Load up the discord.js library
const Discord = require("discord.js");

// This is your client. Some people call it `bot`, some people call it `self`,
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new Discord.Client();

// Here we load the config.json file that contains our token and our prefix values.
const config = require("./config.json");
// config.token contains the bot's token
// config.prefix contains the message prefix.
const responseObject = require("./reply.json");

client.on("ready", () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
  // Example of changing the bot's playing game to something useful. `client.user` is what the
  // docs refer to as the "ClientUser".
  //client.user.setActivity(`Serving ${client.guilds.size} servers`);
    client.user.setActivity(`the game`);
});

client.on("guildCreate", guild => {
  // This event triggers when the bot joins a guild.
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  client.user.setActivity(`Serving ${client.guilds.size} servers`);

});

client.on("guildDelete", guild => {
  // this event triggers when the bot is removed from a guild.
  console.log(`Bot has been removed from: ${guild.name} (id: ${guild.id})`);
  client.user.setActivity(`Serving ${client.guilds.size} servers`);
});

client.on('messageDelete', async (message) => {
  const logs = message.guild.channels.find('name', 'logs');
  if (message.guild.me.hasPermission('MANAGE_CHANNELS') && !logs) {
    message.guild.createChannel('logs', 'text');
  }
  if (!message.guild.me.hasPermission('MANAGE_CHANNELS') && !logs) {
    console.log('The logs channel does not exist and tried to create the channel but I am lacking permissions')
  }
  const entry = await message.guild.fetchAuditLogs({type: 'MESSAGE_DELETE'}).then(audit => audit.entries.first())
  let user = ""
    if (entry.extra.channel.id === message.channel.id
      && (entry.target.id === message.author.id)
      && (entry.createdTimestamp > (Date.now() - 5000))
      && (entry.extra.count >= 1)) {
    user = entry.executor.username
  } else {
    user = message.author.username
  }
  logs.send(`A message was deleted in "#${message.channel.name}" by ${user}`);
})

client.on("message", (message) => {
  if(responseObject[message.content]) {
    message.channel.send(responseObject[message.content]);
  }
});

client.on("message", async message => {
  // This event will run on every single message received, from any channel or DM.

  // It's good practice to ignore other bots. This also makes your bot ignore itself
  // and not get into a spam loop (we call that "botception").
  if(message.author.bot) return;

  // Also good practice to ignore any message that does not start with our prefix,
  // which is set in the configuration file.
  if(message.content.indexOf(config.prefix) !== 0) return;

  // Here we separate our "command" name, and our "arguments" for the command.
  // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
  // command = say
  // args = ["Is", "this", "the", "real", "life?"]
  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  // Let's go with a few common example commands! Feel free to delete or change those.
  //*****************************************************************************************//
  //-----------------------------------------MEX---------------------------------------------//
  //*****************************************************************************************//
    const fetch = require('node-fetch');
    const crypto = require('crypto');
    const qs = require('qs');
    const apiKey = 'TwqnqgxaX-YO3U4t5TRw4FoK'; //HQZ_yb3scM00n1mhcIq1QBzq
    const apiSecret = 'tthe_RKsoq0OLDsUualkWQTzL4NAQku_YdDpcT1OWZZz_chx'; //L7QcywjA5i6x04y3F7lkD0PfLXaJys8DfKdVperGY0EKiqjP
    function makeRequest(verb, endpoint, data = {}) {
      const apiRoot = '/api/v1/';
      const expires = new Date().getTime() + (60 * 1000);  // 1 min in the future

      let query = '', postBody = '';
      if (verb === 'GET')
        query = '?' + qs.stringify(data);
      else
      // Pre-compute the reqBody so we can be sure that we're using *exactly* the same body in the request
      // and in the signature. If you don't do this, you might get differently-sorted keys and blow the signature.
        postBody = JSON.stringify(data);

      const signature = crypto.createHmac('sha256', apiSecret)
        .update(verb + apiRoot + endpoint + query + expires + postBody).digest('hex');

      const headers = {
        'content-type': 'application/json',
        'accept': 'application/json',
        // This example uses the 'expires' scheme. You can also use the 'nonce' scheme. See
        // https://www.bitmex.com/app/apiKeysUsage for more details.
        'api-expires': expires,
        'api-key': apiKey,
        'api-signature': signature,
      };

      const requestOptions = {
        method: verb,
        headers,
      };
      if (verb !== 'GET') requestOptions.body = postBody;  // GET/HEAD requests can't have body

      const url = 'https://www.bitmex.com' + apiRoot + endpoint + query;

      return fetch(url, requestOptions).then(response => response.json()).then(
        response => {
          if ('error' in response) throw new Error(response.error.message);
          return response;
        },
      error => console.error('Network error', error),
      );
    }

    if(command === "xbt.console") {
      (async function main() {
        try {
          const result = await makeRequest('GET', 'position', {
            filter: { symbol: 'XBTUSD' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          console.log(result);
        } catch (e) {
          console.error(e);
          };
      }());
    }

    if(command === "shack") {
      (async function main() {
        try {
          const result_xbt = await makeRequest('GET', 'position', {
            filter: { symbol: 'XBTUSD' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          const result_eth = await makeRequest('GET', 'position', {
            filter: { symbol: 'ETHUSD' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          const result_ada = await makeRequest('GET', 'position', {
            filter: { symbol: 'ADAU18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          //console.log(result_xbt);
          console.log(result_eth);
          message.channel.send(`---------------${result_xbt[0].symbol}---------------\nTime: ${result_xbt[0].timestamp}\nLeverage: ${result_xbt[0].leverage}x\nEntry price: $${result_xbt[0].avgEntryPrice}\nMarket price: $${result_xbt[0].markPrice}\nLiquidation price: $${result_xbt[0].liquidationPrice}\nUnrealized ROE%: ${result_xbt[0].unrealisedRoePcnt*100}%`);
          message.channel.send(`---------------${result_eth[0].symbol}---------------\nTime: ${result_eth[0].timestamp}\nLeverage: ${result_eth[0].leverage}x\nEntry price: $${result_eth[0].avgEntryPrice}\nMarket price: $${result_eth[0].markPrice}\nLiquidation price: $${result_eth[0].liquidationPrice}\nUnrealized ROE%: ${result_eth[0].unrealisedRoePcnt*100}%`);
          message.channel.send(`---------------${result_ada[0].symbol}---------------\nTime: ${result_ada[0].timestamp}\nLeverage: ${result_ada[0].leverage}x\nEntry price: $${result_ada[0].avgEntryPrice}\nMarket price: $${result_ada[0].markPrice}\nLiquidation price: $${result_ada[0].liquidationPrice}\nUnrealized ROE%: ${result_ada[0].unrealisedRoePcnt*100}%`);
        } catch (e) {
          console.error(e);
          };
      }());
    }

    if(command === "xbt") {
      (async function main() {
        try {
          const result = await makeRequest('GET', 'instrument', {
            filter: { symbol: 'XBTUSD' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          //console.log(result);
          message.channel.send(`---------------${result[0].symbol}---------------\nFunding rate: ${result[0].fundingRate*100}%\nMarket price: $${result[0].markPrice}\nVolume: $${result[0].volume}\n24h Volume: $${result[0].volume24h}`);
        } catch (e) {
          console.error(e);
          };
      }());
    }

    if(command === "eth") {
      (async function main() {
        try {
          const result = await makeRequest('GET', 'instrument', {
            filter: { symbol: 'ETHUSD' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          //console.log(result);
          message.channel.send(`---------------${result[0].symbol}---------------\nFunding rate: ${result[0].fundingRate*100}%\nMarket price: $${result[0].markPrice}\nVolume: $${result[0].volume}\n24h Volume: $${result[0].volume24h}`);
        } catch (e) {
          console.error(e);
          };
      }());
    }

    if(command === "xbt.futures") {
      (async function main() {
        try {
          const result_u = await makeRequest('GET', 'instrument', {
            filter: { symbol: 'XBTU18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          const result_z = await makeRequest('GET', 'instrument', {
            filter: { symbol: 'XBTZ18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          //console.log(result);
          message.channel.send(`---------------${result_u[0].symbol}---------------\nFunding rate: ${result_u[0].fundingRate*100}%\nMarket price: $${result_u[0].markPrice}\nVolume: $${result_u[0].volume}\n24h Volume: $${result_u[0].volume24h}`);
          message.channel.send(`---------------${result_z[0].symbol}---------------\nFunding rate: ${result_z[0].fundingRate*100}%\nMarket price: $${result_z[0].markPrice}\nVolume: $${result_z[0].volume}\n24h Volume: $${result_z[0].volume24h}`);
        } catch (e) {
          console.error(e);
          };
      }());
    }
//*****************************************************************************************//
//-----------------------------------------END---------------------------------------------//
//*****************************************************************************************//
  if(command === "test") {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    const m = await message.channel.send("test?");
    m.edit(`Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
  }

  if (command === "server") {
    message.channel.send(`Server name: ${message.guild.name}\nGuild ID: ${message.guild.id}\nMember count: ${message.guild.memberCount}`);
  }

  if (command === "p.xbtswap") {
      message.channel.send(`I hear you but you gotta pay first.\nBTC: 1D5eE8FVF5R4JcvSArh4s1UiVnuwvp3j8R`);
  }

  if (command === "mex") {
      message.channel.send(`!xbt <---> XBTUSD\n!eth <---> ETHUSD\n!xbt.futures <---> XBTU18,XBTZ18`);
  }

  if(command === "say") {
    // makes the bot say something and delete the message. As an example, it's open to anyone to use.
    // To get the "message" itself we join the `args` back into a string with spaces:
    const sayMessage = args.join(" ");
    // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
    message.delete().catch(O_o=>{});
    // And we get the bot to say the thing:
    message.channel.send(sayMessage);
  }

  if(command === "kick") {
    // This command must be limited to mods and admins. In this example we just hardcode the role names.
    // Please read on Array.some() to understand this bit:
    // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/some?
    if(!message.member.roles.some(r=>["Admin", "Mod"].includes(r.name)) )
      return message.reply("You must be an Admin or a Mod to kick people. Get your weight up first!");

    // Let's first check if we have a member and if we can kick them!
    // message.mentions.members is a collection of people that have been mentioned, as GuildMembers.
    // We can also support getting the member by ID, which would be args[0]
    let member = message.mentions.members.first() || message.guild.members.get(args[0]);
    if(!member)
      return message.reply("Member name is invalid.");
    if(!member.kickable)
      return message.reply("This member is not kickable. Either the member has a higher role, or you don't have the neccessary permissions.");

    // slice(1) removes the first part, which here should be the user mention or ID
    // join(' ') takes all the various parts to make it a single string.
    let reason = args.slice(1).join(' ');
    if(!reason) reason = "No reason provided";

    // Now, time for a swift kick in the nuts!
    await member.kick(reason)
      .catch(error => message.reply(`${message.author} couldn't be kicked due to: ${error}`));
    message.reply(`${member.user.tag} has been kicked by ${message.author.tag} due to: ${reason}`);

  }

  if(command === "ban") {
    // Most of this command is identical to kick, except that here we'll only let admins do it.
    // In the real world mods could ban too, but this is just an example, right? ;)
    if(!message.member.roles.some(r=>["Admin", "Mod", "Jay"].includes(r.name)) )
      return message.reply("You must be an Admin or a Mod to kick people. Get your weight up first!");

    let member = message.mentions.members.first();
    if(!member)
      return message.reply("Member name is invalid.");
    if(!member.bannable)
      return message.reply("This member is not kickable. Either the member has a higher role, or you don't have the neccessary permissions.");

    let reason = args.slice(1).join(' ');
    if(!reason) reason = "No reason provided";

    await member.ban(reason)
      .catch(error => message.reply(`${message.author} couldn't be kicked due to: ${error}`));
    message.reply(`${member.user.tag} has been kicked by ${message.author.tag} due to: ${reason}`);
  }

  if(command === "purge") {
    // This command removes all messages from all users in the channel, up to 100.
    if(!message.member.roles.some(r=>["Admin", "Mod", "Jay"].includes(r.name)) )
      return message.reply("You must be an Admin or a Mod to purge. Get your weight up first!");
      // This command removes all messages from all users in the channel, up to 100.
     // get the delete count, as an actual number.
    const deleteCount = parseInt(args[0], 10);
    // Ooooh nice, combined conditions. <3
    if(!deleteCount || deleteCount < 2 || deleteCount > 100)
      return message.reply("Please provide a number between 2 and 100 for the number of messages to delete");
    // So we get our messages, and delete them. Simple enough, right?
    const fetched = await message.channel.fetchMessages({limit: deleteCount});
      message.channel.bulkDelete(fetched)
      .catch(error => message.reply(`Couldn't delete messages because of: ${error}`));
  }

  if (command === "emojis") {
    const emojiList = message.guild.emojis.map(e=>e.toString()).join(" ");
    message.channel.send(emojiList);
  }

  if (command === "google") {
          const got = require('got');
          const cheerio = require('cheerio');
          const { stringify } = require('querystring');
          if (args.length < 1) message.channel.send('Please enter something for me to search.');
          await message.channel.send('Searching......').then(message => { message.delete(1000) });
          const params = {
              q: args.join(' '),
              safe: 'on',
              lr: 'lang_en',
              hl: 'en'
          };
          let resp = await got('https://google.com/search?' + stringify(params), { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) Gecko/20100101 Firefox/53.0' } });
          if (resp.statusCode !== 200) throw 'Google is not responding!!!';
          const $ = cheerio.load(resp.body);
          const results = [];
          let card = null;
          const cardNode = $('div#rso > div._NId').find('div.vk_c, div.g.mnr-c.g-blk, div.kp-blk');
          if (cardNode && cardNode.length !== 0) {
              card = this.parseCards($, cardNode);
          }
          $('.rc > h3 > a').each((i, e) => {
              const link = $(e).attr('href');
              const text = $(e).text();
              if (link) {
                  results.push({ text, link });
              }
          });
          if (card) {
              const value = results.slice(0, 3).map(r => `[${r.text}](${r.link})`).join('\n');
              if (value) {
                  card.addField(`This is what I also found for: "${params.q}" `, value)
                      .setColor(client.utils.randomColor())
                      .setURL(`https://google.com/search?q=${encodeURIComponent(params.q)}`);
              }
              return await message.channel.send(card);
          }
          if (results.length === 0) {
              return await message.channel.send("No results found, sorry!");
          }
          const firstentry = `${results[0].link}`;
          const finalxd = results.slice(0, 3).map(r => `${r.link}`).join('\n');
          await message.channel.send(finalxd);
      }

});

client.login(config.token);
