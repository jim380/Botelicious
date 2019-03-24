//                                                                                                         
//                                                  jim380 <admin@cyphercore.io>
//  ============================================================================
//  
//  Copyright (C) 2019 jim380
//  
//  Permission is hereby granted, free of charge, to any person obtaining
//  a copy of this software and associated documentation files (the
//  "Software"), to deal in the Software without restriction, including
//  without limitation the rights to use, copy, modify, merge, publish,
//  distribute, sublicense, and/or sell copies of the Software, and to
//  permit persons to whom the Software is furnished to do so, subject to
//  the following conditions:
//  
//  The above copyright notice and this permission notice shall be
//  included in all copies or substantial portions of the Software.
//  
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
//  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
//  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
//  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
//  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
//  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
//  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//  
//  ============================================================================
const fetch = require('node-fetch');
const config = require("./config.json");

const TeleBot = require('telebot');
const bot = new TeleBot({
  token: `${config.token}`,
  usePlugins: ['namedButtons','askUser'],
  pluginFolder: '../plugins/',
  pluginConfig: {
      namedButtons: {
          //buttons: BUTTONS
      }
  }
});

function makeRequest(verb, endpoint, data = {}) {
  postBody = JSON.stringify(data);

  const headers = {
    'content-type': 'application/json',
    'accept': 'application/json',
  };

  const requestOptions = {
    method: verb,
    //body: JSON.stringify(data),
    headers,
  };

  if (verb !== 'GET') requestOptions.body = postBody;

  const url = `${config.node.url}`+ `:${config.node.ports[2]}` + endpoint;

  // fetch(url, requestOptions)
  // .then(res => res.json())
  // .then(async response => await console.log(`${endpoint}\n\u200b\n${response.data[0].amount/1e18} ETH\n-----------------\n`))
  // // or JSON.stringify(response)
  // .catch(error => console.error('Error:\n', error));
  return fetch(url, requestOptions);
}

// error handling
const handleErrors = (e,chatid) => {
  //console.log(e);
  if (e.name == 'TypeError') {
    console.error(e);
    bot.sendMessage(chatid,`Account not found!`);  
  } else {
    console.error(e);
    bot.sendMessage(chatid,`Ooops... connection issue!`);
  }
}

//-----------------------------------------------------------------------------------------//
//-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.GET-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.//
//-----------------------------------------------------------------------------------------//

//----------------------------------------------------//
//                       node info                    //
//----------------------------------------------------//
bot.on('/node_info', async msg => {
  //const addr = msg.text;
  makeRequest('GET', '/node_info', {})
  .then(res => res.json())
  .then(async response => {
    //console.log(response);
    await bot.sendMessage(msg.from.id,`\`Moniker\`: ${response.moniker}`, {parseMode: 'Markdown'})
    
  })
  .catch(error => handleErrors(error, msg.from.id));
});

//----------------------------------------------------//
//                     staking pool                   //
//----------------------------------------------------//
bot.on('/staking_pool', async msg => {
  //const addr = msg.text;
  makeRequest('GET', '/staking/pool', {})
  .then(res => res.json())
  .then(async response => {
    //console.log(response);
    await bot.sendMessage(msg.from.id,`\`Bonded\`: ${response.bonded_tokens}\n`
    + `\`Unbonded\`: ${response.not_bonded_tokens}\n`, {parseMode: 'Markdown'})
    
  })
  .catch(error => handleErrors(error, msg.from.id));
});

//----------------------------------------------------//
//                      votes                         //
//----------------------------------------------------//
bot.on('/votes', async (msg) => {
  return bot.sendMessage(msg.chat.id, `Please provide a proposal ID.`, {ask: 'propID'});
});

bot.on('ask.propID', async msg => {
  const id = msg.text;
  makeRequest('GET', `/gov/proposals/${id}/votes`, {})
  .then(res => res.json())
  .then(async response => {
    console.log(response);
    //await bot.sendMessage(msg.from.id,`\`Moniker\`: ${response.moniker}`, {parseMode: 'Markdown'})
    
  })
  .catch(error => handleErrors(error, msg.from.id));
});

//----------------------------------------------------//
//                       balance                      //
//----------------------------------------------------//
bot.on('/balance', async (msg) => {
  return bot.sendMessage(msg.chat.id, `Please provide an account address.`, {ask: 'accountAddrBalance'});
});

bot.on('ask.accountAddrBalance', async msg => {
  const addr = msg.text;
  makeRequest('GET', `/bank/balances/${addr}`, {})
  .then(res => res.json())
  .then(async response => {
    //console.log(response);
    await bot.sendMessage(msg.from.id,`${response[0].amount} \`${response[0].denom}\``, {parseMode: 'Markdown'})
    
  })
  .catch(error => handleErrors(error, msg.from.id));
});

//-----------------------------------------------------------------------------------------//
//-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-POST.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-//
//-----------------------------------------------------------------------------------------//

//----------------------------------------------------//
//                   submit proposal                  //
//----------------------------------------------------//
bot.on('/proposal', async (msg) => {
  return bot.sendMessage(msg.chat.id, `Please provide an account address.`, {ask: 'accountAddrProp'});
});

bot.on('ask.accountAddrProp', async msg => {
  const addr = msg.text;
  makeRequest('POST', `/gov/proposals`, {
    "base_req": {
      "from": `${addr}`,
      "memo": "test",
      "chain_id": "gaia-13002",
      "account_number": "0",
      "sequence": "1",
      "gas": "200000",
      "gas_adjustment": "1.2",
      "fees": [
        {
          "denom": "muon",
          "amount": "10000"
        }
      ],
      "simulate": false
    },
    "title": "test",
    "description": "test",
    "proposal_type": "text",
    "proposer": `${addr}`,
    "initial_deposit": [
      {
        "denom": "muon",
        "amount": "10000"
      }
    ]
  })
  .then(res => res.json())
  .then(async response => {
    //console.log(JSON.stringify(response));
    await bot.sendMessage(msg.from.id,`${JSON.stringify(response)}`, {parseMode: 'Markdown'})
    
  })
  .catch(error => handleErrors(error, msg.from.id));
});

//----------------------------------------------------//
//                  submit delegation                 //
//----------------------------------------------------//
bot.on('/delegate', async (msg) => {
  return bot.sendMessage(msg.chat.id, `Please provide an address you'd like to delegate from.`, {ask: 'accountAddrDelegate'});
});

bot.on('ask.accountAddrDelegate', async msg => {
  const addr = msg.text;
  makeRequest('POST', `/staking/delegators/${addr}/delegations`, {
    "base_req": {
      "from": `${addr}`,
      "memo": "test",
      "chain_id": "gaia-13002",
      "account_number": "0",
      "sequence": "1",
      "gas": "200000",
      "gas_adjustment": "1.2",
      "fees": [
        {
          "denom": "muon",
          "amount": "50000"
        }
      ],
      "simulate": false
    },
    "delegator_address": `${addr}`,
    "validator_address": "cosmosvaloper1yds9h4lqn0xggm3kahn0vznhv59cljjlfh3sa2",
    "delegation": {
      "denom": "muon",
      "amount": "100000"
    }
  })
  .then(res => res.json())
  .then(async response => {
    //console.log(JSON.stringify(response));
    await bot.sendMessage(msg.from.id,`${JSON.stringify(response)}`, {parseMode: 'Markdown'})
    
  })
  .catch(error => handleErrors(error, msg.from.id));
});

//----------------------------------------------------//
//                      broadcast txs                 //
//----------------------------------------------------//
// tx json pasted in here has been executed
bot.on('/txs', async msg => {
  //const addr = msg.text;
  makeRequest('POST', `/txs`, 
  {
    "type": "auth/StdTx",
    "tx": {
       "msg": [
          {
             "type": "cosmos-sdk/MsgSubmitProposal",
             "value": {
                "title": "test",
                "description": "test",
                "proposal_type": "Text",
                "proposer": "cosmos1pjmngrwcsatsuyy8m3qrunaun67sr9x78qhlvr",
                "initial_deposit": null
             }
          }
       ],
       "fee": {
          "amount": [
             {
                "denom": "muon",
                "amount": "5000"
             }
          ],
          "gas": "200000"
       },
       "signatures": [
          {
             "pub_key": {
                "type": "tendermint/PubKeySecp256k1",
                "value": "AlX825sr2FmvR8R/sizJMm2zuY74AxBrL+tbgrGPG+JN"
             },
             "signature": "aOarcMcG2pGgvuK5A5EU0uKRspUlbn/GYdumAn0c255B6iLmBNTUn8R1G5jIaLVrCmumkJPS4ItjNW4vgqaiQg=="
          }
       ],
       "memo": ""
    },
    "return": "block",
 }
 )
  .then(res => res.json())
  .then(async response => {
    //console.log(JSON.stringify(response));
    await bot.sendMessage(msg.from.id,`${JSON.stringify(response)}`, {parseMode: 'Markdown'})
    
  })
  .catch(error => handleErrors(error, msg.from.id));
});


bot.connect();