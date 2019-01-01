// Load the discord.js library
const Discord = require("discord.js");
const got = require('got');
const cheerio = require('cheerio');
const { stringify } = require('querystring');
//***************************************//
//                 Client                //
//***************************************//
const client = new Discord.Client();

//***************************************//
//Load config.json which contains your   //
//Discord bot token and prefix.          //
//***************************************//
const config = require("./config.json");

// Load cosmos node url, and http module
const cosmos_node_rpc = `http://${config.cosmos_node.url}:${config.cosmos_node.rpc_port}`;

//***************************************//
//                 Reply                 //
//***************************************//
const responseObject = require("./reply.json");

//***************************************//
//              Log on message           //
//***************************************//
client.on("ready", () => {
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    client.user.setActivity(`the game`);
});

//***************************************//
//           Bot added to a server       //
//***************************************//
client.on("guildCreate", guild => {
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  client.user.setActivity(`Serving ${client.guilds.size} servers`);

});

//***************************************//
//        Bot removed from a server      //
//***************************************//
client.on("guildDelete", guild => {
  console.log(`Bot has been removed from: ${guild.name} (id: ${guild.id})`);
  client.user.setActivity(`Serving ${client.guilds.size} servers`);
});


//***************************************//
// Logs channel:                         //
// keeps message; delete history         //
//***************************************//
client.on('messageDelete', async (message) => {
  const logs = message.guild.channels.find('name', 'logs');
  if (message.guild.me.hasPermission('MANAGE_CHANNELS') && !logs) {
    message.guild.createChannel('logs', 'text');
  }
  if (!message.guild.me.hasPermission('MANAGE_CHANNELS') && !logs) {
    console.log('Logs channel does not exist! Need permission to create one.')
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

//***************************************//
// Message send:                         //
// triggers whenever the bot receives    //
// a message (in channel or DM)          //
//***************************************//
client.on("message", async message => {
  // Ignores messages from other bots & itself
  if(message.author.bot) return;

  // Ignores any message that does not start
  // with the prefix,
  if(message.content.indexOf(config.prefix) !== 0) return;

  // Separate command and its arguments
  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

//-----------------------------------------------------------------------------------------//
//                                         MEX                                             //
//-----------------------------------------------------------------------------------------//
    const fetch = require('node-fetch');
    const crypto = require('crypto');
    const qs = require('qs');
    const apiKey = '';
    const apiSecret = '';
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

    if(command === "console") {
      (async function main() {
        try {
          const result = await makeRequest('GET', 'position', {
            filter: { symbol: 'ETHUSD' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          console.log(result[0]);
        } catch (e) {
          console.error(e);
          };
      }());
    }

    if(command === "shack") {
      (async function main() {
        try {
          await message.channel.send('Working hard fetching data...').then(message => { message.delete(5000) });
//_____________________________________________________________________________
          const xbt_p = await makeRequest('GET', 'position', {
            filter: { symbol: 'XBTUSD' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          const xbt_z = await makeRequest('GET', 'position', {
            filter: { symbol: 'XBTZ18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          const xbt_h = await makeRequest('GET', 'position', {
            filter: { symbol: 'XBTH19' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          const eth_p = await makeRequest('GET', 'position', {
            filter: { symbol: 'ETHUSD' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          const eth_z = await makeRequest('GET', 'position', {
            filter: { symbol: 'ETHZ18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });

          const ada_p = await makeRequest('GET', 'position', {
            filter: { symbol: 'ADAZ18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          const ltc_p = await makeRequest('GET', 'position', {
            filter: { symbol: 'LTCZ18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          const trx_p = await makeRequest('GET', 'position', {
            filter: { symbol: 'TRXZ18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });

          const bch_p = await makeRequest('GET', 'position', {
            filter: { symbol: 'BCHZ18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          const eos_p = await makeRequest('GET', 'position', {
            filter: { symbol: 'EOSZ18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          const xrp_p = await makeRequest('GET', 'position', {
            filter: { symbol: 'XRPZ18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          //           0    1    2    3    4    5    6    7    8    9
          //var result=[xbt, eth, ada, ltc, trx, u18, z18, bch, eos, xrp];
          //             0      1      2      3      4      5      6      7      8      9      10     11     12     13
          var result_p=[xbt_p, xbt_z, xbt_h, eth_p, eth_z, ada_p, xrp_p, trx_p, bch_p, eos_p, ltc_p];
  //_____________________________________________________________________________
          //--- XBTUSD ---//
          if(result_p[0][0].isOpen === true){
          var pt = "";
          pt = result_p[0][0].avgEntryPrice >= result_p[0][0].markPrice ? (result_p[0][0].unrealisedRoePcnt >0 ? "short" : "long") : (result_p[0][0].unrealisedRoePcnt >0 ? "long" : "short");
          //console.log(pt);
          //console.log(result_p[0][0]);
          message.channel.send(`---------------${result_p[0][0].symbol}---------------\n**Opening time**: ${result_p[0][0].openingTimestamp}\n**Position**: ${pt}\n**leverage**: ${result_p[0][0].leverage}x\n**Entry price**: $${result_p[0][0].avgEntryPrice}\n**Market price**: $${result_p[0][0].markPrice}\n**Liquidation price**: $${result_p[0][0].liquidationPrice}\n**Unrealized ROE%**: ${result_p[0][0].unrealisedRoePcnt*100}%`);
          }
          //--- ETHUSD ---//
          if(result_p[3][0].isOpen === true){
          var pt = "";
          pt = result_p[3][0].avgEntryPrice >= result_p[3][0].markPrice ? (result_p[3][0].unrealisedRoePcnt >0 ? "short" : "long") : (result_p[3][0].unrealisedRoePcnt >0 ? "long" : "short");
          //console.log(result_p[3][0]);
          message.channel.send(`---------------${result_p[3][0].symbol}---------------\n**Opening time**: ${result_p[3][0].openingTimestamp}\n**Position**: ${pt}\n**leverage**: ${result_p[3][0].leverage}x\n**Entry price**: $${result_p[3][0].avgEntryPrice}\n**Market price**: $${result_p[3][0].markPrice}\n**Liquidation price**: $${result_p[3][0].liquidationPrice}\n**Unrealized ROE%**: ${result_p[3][0].unrealisedRoePcnt*100}%`);
          }
          //--- ADAZ18 ---//
          if(result_p[5][0].isOpen === true){
          var pt = "";
          pt = result_p[5][0].avgEntryPrice >= result_p[5][0].markPrice ? (result_p[5][0].unrealisedRoePcnt >0 ? "short" : "long") : (result_p[5][0].unrealisedRoePcnt >0 ? "long" : "short");
          //console.log(result_p[5][0]);
          message.channel.send(`---------------${result_p[5][0].symbol}---------------\n**Opening time**: ${result_p[5][0].openingTimestamp}\n**Position**: ${pt}\n**leverage**: ${result_p[5][0].leverage}x\n**Entry price**: ₿${result_p[5][0].avgEntryPrice}\n**Market price**: ₿${result_p[5][0].markPrice}\n**Liquidation price**: ₿${result_p[5][0].liquidationPrice}\n**Unrealized ROE%**: ${result_p[5][0].unrealisedRoePcnt*100}%`);
          }
          //--- XRPZ18 ---//
          if(result_p[6][0].isOpen === true){
          var pt = "";
          pt = result_p[6][0].avgEntryPrice >= result_p[6][0].markPrice ? (result_p[6][0].unrealisedRoePcnt >0 ? "short" : "long") : (result_p[6][0].unrealisedRoePcnt >0 ? "long" : "short");
          //console.log(result_p[6][0]);
          message.channel.send(`---------------${result_p[6][0].symbol}---------------\n**Opening time**: ${result_p[6][0].openingTimestamp}\n**Position**: ${pt}\n**leverage**: ${result_p[6][0].leverage}x\n**Entry price**: ₿${result_p[6][0].avgEntryPrice}\n**Market price**: ₿${result_p[6][0].markPrice}\n**Liquidation price**: ₿${result_p[6][0].liquidationPrice}\n**Unrealized ROE%**: ${result_p[6][0].unrealisedRoePcnt*100}%`);
          }
          //--- TRXZ18 ---//
          if(result_p[7][0].isOpen === true){
          var pt = "";
          pt = result_p[7][0].avgEntryPrice >= result_p[7][0].markPrice ? (result_p[7][0].unrealisedRoePcnt >0 ? "short" : "long") : (result_p[7][0].unrealisedRoePcnt >0 ? "long" : "short");
          //console.log(result_p[7][0]);
          message.channel.send(`---------------${result_p[7][0].symbol}---------------\n**Opening time**: ${result_p[7][0].openingTimestamp}\n**Position**: ${pt}\n**leverage**: ${result_p[7][0].leverage}x\n**Entry price**: ₿${result_p[7][0].avgEntryPrice}\n**Market price**: ₿${result_p[7][0].markPrice}\n**Liquidation price**: ₿${result_p[7][0].liquidationPrice}\n**Unrealized ROE%**: ${result_p[7][0].unrealisedRoePcnt*100}%`);
          }
          //--- BCHZ18 ---//
          if(result_p[8][0].isOpen === true){
          var pt = "";
          pt = result_p[8][0].avgEntryPrice >= result_p[8][0].markPrice ? (result_p[8][0].unrealisedRoePcnt >0 ? "short" : "long") : (result_p[8][0].unrealisedRoePcnt >0 ? "long" : "short");
          //console.log(result_p[8][0]);
          message.channel.send(`---------------${result_p[8][0].symbol}---------------\n**Opening time**: ${result_p[8][0].openingTimestamp}\n**Position**: ${pt}\n**leverage**: ${result_p[8][0].leverage}x\n**Entry price**: ₿${result_p[8][0].avgEntryPrice}\n**Market price**: ₿${result_p[8][0].markPrice}\n**Liquidation price**: ₿${result_p[8][0].liquidationPrice}\n**Unrealized ROE%**: ${result_p[8][0].unrealisedRoePcnt*100}%`);
          }
          //--- EOSZ18 ---//
          if(result_p[9][0].isOpen === true){
          var pt = "";
          pt = result_p[9][0].avgEntryPrice >= result_p[9][0].markPrice ? (result_p[9][0].unrealisedRoePcnt >0 ? "short" : "long") : (result_p[9][0].unrealisedRoePcnt >0 ? "long" : "short");
          //console.log(result_p[9][0]);
          message.channel.send(`---------------${result_p[9][0].symbol}---------------\n**Opening time**: ${result_p[9][0].openingTimestamp}\n**Position**: ${pt}\n**leverage**: ${result_p[9][0].leverage}x\n**Entry price**: ₿${result_p[9][0].avgEntryPrice}\n**Market price**: ₿${result_p[9][0].markPrice}\n**Liquidation price**: ₿${result_p[9][0].liquidationPrice}\n**Unrealized ROE%**: ${result_p[9][0].unrealisedRoePcnt*100}%`);
          }
          //--- XBTZ18 ---//
          if(result_p[1][0].isOpen === true){
          var pt = "";
          pt = result_p[1][0].avgEntryPrice >= result_p[1][0].markPrice ? (result_p[1][0].unrealisedRoePcnt >0 ? "short" : "long") : (result_p[1][0].unrealisedRoePcnt >0 ? "long" : "short");
          //console.log(result_p[1][0]);
          message.channel.send(`---------------${result_p[1][0].symbol}---------------\n**Opening time**: ${result_p[1][0].openingTimestamp}\n**Position**: ${pt}\n**leverage**: ${result_p[1][0].leverage}x\n**Entry price**: $${result_p[1][0].avgEntryPrice}\n**Market price**: $${result_p[1][0].markPrice}\n**Liquidation price**: $${result_p[1][0].liquidationPrice}\n**Unrealized ROE%**: ${result_p[1][0].unrealisedRoePcnt*100}%`);
          }
          //--- ETHZ18 ---//
          if(result_p[4][0].isOpen === true){
          var pt = "";
          pt = result_p[4][0].avgEntryPrice >= result_p[4][0].markPrice ? (result_p[4][0].unrealisedRoePcnt >0 ? "short" : "long") : (result_p[4][0].unrealisedRoePcnt >0 ? "long" : "short");
          //console.log(result_p[4][0]);
          message.channel.send(`---------------${result_p[4][0].symbol}---------------\n**Opening time**: ${result_p[4][0].openingTimestamp}\n**Position**: ${pt}\n**leverage**: ${result_p[4][0].leverage}x\n**Entry price**: ₿${result_p[4][0].avgEntryPrice}\n**Market price**: ₿${result_p[4][0].markPrice}\n**Liquidation price**: ₿${result_p[4][0].liquidationPrice}\n**Unrealized ROE%**: ${result_p[4][0].unrealisedRoePcnt*100}%`);
          }
          //--- LTCZ18 ---//
          if(result_p[10][0].isOpen === true){
          var pt = "";
          pt = result_p[10][0].avgEntryPrice >= result_p[10][0].markPrice ? (result_p[10][0].unrealisedRoePcnt >0 ? "short" : "long") : (result_p[10][0].unrealisedRoePcnt >0 ? "long" : "short");
          //console.log(result_p[9][0]);
          message.channel.send(`---------------${result_p[10][0].symbol}---------------\n**Opening time**: ${result_p[10][0].openingTimestamp}\n**Position**: ${pt}\n**leverage**: ${result_p[10][0].leverage}x\n**Entry price**: ₿${result_p[10][0].avgEntryPrice}\n**Market price**: ₿${result_p[10][0].markPrice}\n**Liquidation price**: ₿${result_p[10][0].liquidationPrice}\n**Unrealized ROE%**: ${result_p[10][0].unrealisedRoePcnt*100}%`);
          }
          //--- XBTH19 ---//
          if(result_p[2][0].isOpen === true){
          var pt = "";
          pt = result_p[2][0].avgEntryPrice >= result_p[2][0].markPrice ? (result_p[2][0].unrealisedRoePcnt >0 ? "short" : "long") : (result_p[2][0].unrealisedRoePcnt >0 ? "long" : "short");
          //console.log(result_p[2][0]);
          message.channel.send(`---------------${result_p[2][0].symbol}---------------\n**Opening time**: ${result_p[2][0].openingTimestamp}\n**Position**: ${pt}\n**leverage**: ${result_p[2][0].leverage}x\n**Entry price**: $${result_p[2][0].avgEntryPrice}\n**Market price**: $${result_p[2][0].markPrice}\n**Liquidation price**: $${result_p[2][0].liquidationPrice}\n**Unrealized ROE%**: ${result_p[2][0].unrealisedRoePcnt*100}%`);
          }
        } catch (e) {
          console.error(e);
          };
      }());
    }

    if(command === "xbt") {
      (async function main() {
        try {
          const xbt = await makeRequest('GET', 'instrument', {
            filter: { symbol: 'XBTUSD' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          message.channel.send(`---------------${xbt[0].symbol}---------------\n**Funding rate**: ${xbt[0].fundingRate*100}%\n**Market price**: $${xbt[0].markPrice}`);
        } catch (e) {
          console.error(e);
          };
      }());
    }

    if(command === "eth") {
      (async function main() {
        try {
          const eth = await makeRequest('GET', 'instrument', {
            filter: { symbol: 'ETHUSD' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          message.channel.send(`---------------${eth[0].symbol}---------------\n**Funding rate**: ${eth[0].fundingRate*100}%\n**Market price**: $${eth[0].markPrice}`);
        } catch (e) {
          console.error(e);
          };
      }());
    }

    if(command === "ada") {
      (async function main() {
        try {
          const ada = await makeRequest('GET', 'instrument', {
            filter: { symbol: 'ADAZ18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          message.channel.send(`---------------${ada[0].symbol}---------------\n**Market price**: ₿${ada[0].markPrice}`);
        } catch (e) {
          console.error(e);
          };
      }());
    }

    if(command === "ltc") {
      (async function main() {
        try {
          const ltc = await makeRequest('GET', 'instrument', {
            filter: { symbol: 'LTCZ18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          message.channel.send(`---------------${ltc[0].symbol}---------------\n**Market price**: ₿${ltc[0].markPrice}`);
        } catch (e) {
          console.error(e);
          };
      }());
    }

    if(command === "trx") {
      (async function main() {
        try {
          const trx = await makeRequest('GET', 'instrument', {
            filter: { symbol: 'TRXZ18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          message.channel.send(`---------------${trx[0].symbol}---------------\n**Market price**: ₿${trx[0].markPrice}`);
        } catch (e) {
          console.error(e);
          };
      }());
    }

    if(command === "xbt.futures") {
      (async function main() {
        try {
          const h19 = await makeRequest('GET', 'instrument', {
            filter: { symbol: 'XBTH19' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          const z18 = await makeRequest('GET', 'instrument', {
            filter: { symbol: 'XBTZ18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          message.channel.send(`---------------${z18[0].symbol}---------------\n**Market price**: $${z18[0].markPrice}`);
          message.channel.send(`---------------${h19[0].symbol}---------------\n**Market price**: $${h19[0].markPrice}`);
        } catch (e) {
          console.error(e);
          };
      }());
    }

    if(command === "eth.futures") {
      (async function main() {
        try {
          const z18 = await makeRequest('GET', 'instrument', {
            filter: { symbol: 'ETHZ18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          message.channel.send(`---------------${z18[0].symbol}---------------\n**Market price**: ₿${z18[0].markPrice}`);
        } catch (e) {
          console.error(e);
          };
      }());
    }

    if(command === "bch") {
      (async function main() {
        try {
          const bch = await makeRequest('GET', 'instrument', {
            filter: { symbol: 'BCHZ18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          message.channel.send(`---------------${bch[0].symbol}---------------\n**Market price**: ₿${bch[0].markPrice}`);
        } catch (e) {
          console.error(e);
          };
      }());
    }

    if(command === "eos") {
      (async function main() {
        try {
          const eos = await makeRequest('GET', 'instrument', {
            filter: { symbol: 'EOSZ18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          message.channel.send(`---------------${eos[0].symbol}---------------\n**Market price**: ₿${eos[0].markPrice}`);
        } catch (e) {
          console.error(e);
          };
      }());
    }

    if(command === "xrp") {
      (async function main() {
        try {
          const xrp = await makeRequest('GET', 'instrument', {
            filter: { symbol: 'XRPZ18' },
            //columns: ['currentQty', 'avgEntryPrice'],
          });
          message.channel.send(`---------------${xrp[0].symbol}---------------\n**Market price**: ₿${xrp[0].markPrice}`);
        } catch (e) {
          console.error(e);
          };
      }());
    }
//-----------------------------------------------------------------------------------------//
//                                         End                                             //
//-----------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------//
//                                    Cosmos Node Commands                                 //
//-----------------------------------------------------------------------------------------//   
  if(command === "cosmos") {
    switch (args.join(" ")) {
      case 'node info':
        fetch(cosmos_node_rpc+'/status')
        .then(res => res.json())
        .then(json => message.channel.send(`**Network**: ${json.result.node_info.network}\n`
        +`**id**: ${json.result.node_info.id}\n`
        +`**Moniker**: ${json.result.node_info.moniker}\n`
        +`**Address**: ${json.result.validator_info.address}\n`
        +`**Voting Power**: ${json.result.validator_info.voting_power}\n`
        +`**Synced up**: ${json.result.sync_info.catching_up}\n`
        )) 
        .catch(e => console.log(e));  
        break;

      case 'last block':
        fetch(cosmos_node_rpc+'/status')
        .then(res => res.json())
        .then(json => message.channel.send(json.result.sync_info.latest_block_height)) 
        .catch(e => console.log(e));  
        break;

      case 'chain id':
        fetch(cosmos_node_rpc+'/genesis')
        .then(res => res.json())
        .then(json => message.channel.send(json.result.genesis.chain_id))  
        .catch(e => console.log(e));  
        break; 

      case 'validators':
        fetch(cosmos_node_rpc+'/status')
        .then(res => res.json())
        .then(json => {
          let latestBlockHeight = json.result.sync_info.latest_block_height
          if (latestBlockHeight == 0) {
          // If height == 0, get validators from "/dump_consensus_state" ???
            fetch(cosmos_node_rpc+'/dump_consensus_state')
            .then(res => res.json())
            .then(json => message.channel.send(json.result.round_state.validators.validators.length));
          }
          else {
          // If height >= 0 get from "/validators?height="
            fetch(cosmos_node_rpc+'/validators?height='+latestBlockHeight)
            .then(res => res.json())
            .then(json => {
              message.channel.send(`**Total Count at Block ${latestBlockHeight}**: ${json.result.validators.length}\n\u200b\n`)
              let validators = json.result.validators; 
              let total_voting_power = 0;
              let i = 1;
              for (let validator of validators) {
                message.channel.send(`${i}.\n**Address**: ${validator.address}\n`
                +`**Voting Power**: ${validator.voting_power}\n`
                +`**Proposer Priority**: ${validator.proposer_priority}\n\u200b\n`);
                total_voting_power += Number(validator.voting_power);
                i++;
              }
              message.channel.send(`**Total Voting Power**: ${total_voting_power}`);
            });
          }
        })
        .catch(e => console.log(e));   
        break;


      case 'votes':
        fetch(cosmos_node_rpc+'/dump_consensus_state')
        .then(res => res.json())
        .then(json => {
          let vote_rounds = json.result.round_state.votes;
          for (let vote_round of vote_rounds) {  
            let nil_prevotes = 0;

              for (let prevote of vote_round.prevotes) {
                if(prevote === 'nil-Vote') {
                  nil_prevotes++;
                }
              } 
            message.channel.send(`Round: ${vote_round.round}\nVoted: ${vote_round.prevotes.length-nil_prevotes}/${vote_round.prevotes.length} - ${((vote_round.prevotes.length-nil_prevotes)/vote_round.prevotes.length*100).toFixed(2)}%\n------\n`);
          }

        })
        .catch(e => console.log(e));   
        break;
        
      case 'peers':
        fetch(cosmos_node_rpc+'/net_info')
        .then(res => res.json())
        .then(json => {
          message.channel.send(`**Total count**: ${json.result.n_peers}\n\u200b\n`)
          let peers = json.result.peers; 
          let i = 1;
          for (let peer of peers) {
            message.channel.send(`${i}.\n**id**: ${peer.node_info.id}\n`
            +`**Moniker**: ${peer.node_info.moniker}\n\u200b\n`);
            i++;
          }
        })
        .catch(e => console.log(e));  
        break;

      case 'genesis validators':
        fetch(cosmos_node_rpc+'/genesis')
        .then(res => res.json())
        .then(json => {
          message.channel.send(`**Total count**: ${json.result.genesis.validators.length}\n\u200b\n`)
          let validators = json.result.genesis.validators;
          let total_voting_power = 0;
          let i = 1;
          for (let validator of validators) {
            message.channel.send(`${i}.\n**Address**: ${validator.address}\n`
            +`**Name**: ${validator.name}\n`
            +`**Power**: ${validator.power}\n\u200b\n`);
            total_voting_power += Number(validator.power);
            i++;
          }
          message.channel.send(`**Total Voting Power**: ${total_voting_power}`);
        })
        .catch(e => console.log(e));   
        break;

      // parse dump_consensus_state (result.round_state.validators.validators)
      // aka detailed info on validators
      case 'validators power':
        fetch(cosmos_node_rpc+'/dump_consensus_state')
        .then(res => res.json())
        // Get json from rpc, convert it to string, and format using regex
        .then((json) => {
          let validators = json.result.round_state.validators.validators;
          let total_voting_power = 0;
          let i = 1;
          for (let validator of validators) {
            message.channel.send(`validator ${i}\naddress: ${validator.address}\nvoting power: ${validator.voting_power} stake\n---------\n`);
            total_voting_power += Number(validator.voting_power);
            i++;
          }
         message.channel.send(`Total voting power: ${total_voting_power} stake`);
        })
        .catch(e => console.log(e));  
        break; 

      // parse status endpoint (result)
      // not really usefull
      // case 'rpc status':
      //   fetch(cosmos_node_rpc+'/status')
      //   .then(res => res.json())
      //   // Get json from rpc, convert it to string, and format using regex
      //   .then( (json) => {
      //     // Regex used
      //     rxp_nested_json = /":{"/g;
      //     rxp_brackets = /[{}"]/g;
      //     rxp_delimeter = /,/g;
      //     // Apply regex
      //     var json_str = JSON.stringify(json.result).replace(rxp_nested_json, "\n--------\n").replace(rxp_brackets, '').replace(rxp_delimeter,'\n');
      //     message.channel.send(json_str);
      //   })
      //   .catch(e => console.log(e));  
      //   break; 

      default:
        message.channel.send(`Available commands:\n\u200b\n`
        +`**last block** - (current block height)\n`
        +`**node info** - (node-id, address etc.)\n`
        +`**peers** - (num. of peers and peers info)\n`
        +`**validators** - (validators at current height)\n`
        +`**genesis validators** - (duh)\n`
        +`**votes** - (WIP)`);
    }       
  }
//-----------------------------------------------------------------------------------------//
//                                       End Cosmos                                        //
//-----------------------------------------------------------------------------------------//


//---------------------------------------//
//            Command examples           //
//---------------------------------------//
  if(command === "test") {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    const m = await message.channel.send("test?");
    m.edit(`Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
  }

  if (command === "server") {
    message.channel.send(`Server name: ${message.guild.name}\nGuild ID: ${message.guild.id}\nMember count: ${message.guild.memberCount}`);
  }

  if (command === "js") {
      message.channel.send(`I hear you but you gotta pay first.\nBTC: 1D5eE8FVF5R4JcvSArh4s1UiVnuwvp3j8R`);
  }

  if (command === "mex") {
      message.channel.send(`!xbt <---> XBTUSD\n!eth <---> ETHUSD\n!xbt.futures <---> XBTZ18, XBTH19\n!eth.futures <---> ETHZ18\n!ada <---> ADAZ18\n!ltc <---> LTCZ18\n!trx <---> TRXZ18\n!bch <---> BCHZ18\n!xrp <---> XRPZ18\n!eos <---> EOSZ18\n!shack <---> Shack's open position(s)\n!js <---> Jay's open position(s)`);
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
          //const got = require('got');
          //const cheerio = require('cheerio');
          //const { stringify } = require('querystring');
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
