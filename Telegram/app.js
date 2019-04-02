//                                                                                                         
//                                                  jim380 <admin@cyphercore.io>
//  ============================================================================
//  
//  Copyright (C) 2018 jim380, aakatev
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
const TeleBot = require('telebot');
//-----------------------------------------------------------------------------------------//
//                                       Buttons                                           //
//-----------------------------------------------------------------------------------------//
// button naming
const BUTTONS = {
  bitmex: {
      label: '₿ Bitmex',
      command: '/mex'
  },
  cosmos: {
      label: 'Ø Cosmos',
      command: '/cosmos'
  },
  hide: {
      label: '⌨ Hide Keyboard',
      command: '/hide'
  },
  home: {
    label: '⌂ Home',
    command: '/home'
  },
  backCosmos: {
    label: '↵ Back',
    command: '/backCosmos'
  },
  nodeQuery: {
    label: 'Node Queries',
    command: '/node_queries'
  },
  chainQuery: {
    label: 'Chain Queries',
    command: '/chain_queries'
  },
  lcdQuery: {
    label: 'Light Client Queries',
    command: '/lcd_queries'
  },
  alerts: {
    label: 'Alerts',
    command: '/alerts'
  },
  nodeStatus: {
    label: 'Status',
    command: '/node_status'
  },
  lastBlock: {
    label: 'Last Block',
    command: '/last_block'
  },
  peersCount: {
    label: 'Peers Count',
    command: '/peers_count'
  },
  peersList: {
    label: 'Peers List',
    command: '/peers_list'
  },
  mempoolFlush: {
    label: 'Flush Mempool',
    command: '/mempool_flush'
  },
  consensusState: {
    label: 'Consensus State',
    command: '/consensus_state'
  },
  consensusParams: {
    label: 'Consensus Parameters',
    command: '/consensus_params'
  },
  validatorsCount: {
    label: 'Validators Count',
    command: '/validators_count'
  },
  validatorsList: {
    label: 'Validators List',
    command: '/validators_list'
  },
  chainBlock: {
    label: 'Block Lookup',
    command: '/block_lookup'
  },
  chainTxHash: {
    label: 'Transaction Lookup',
    command: '/tx_lookup'
  },
  nodeBalance: {
    label: 'Balance',
    command: '/account_balance'
  },
  nodeKeys: {
    label: 'Keys',
    command: '/node_keys'
  },

};

//----------------------------------------------------//
//                       Plug-ins                     //
//----------------------------------------------------//
const bot = new TeleBot({
  token: '',
  usePlugins: ['namedButtons','askUser'],
  pluginFolder: '../plugins/',
  pluginConfig: {
      namedButtons: {
          buttons: BUTTONS
      }
  }
});
//----------------------------------------------------//
//                  Keyboard - General                //
//----------------------------------------------------//
// fire up top-level keyboard
bot.on(['/start', '/home', '/backhome'], msg => {
  let replyMarkup = bot.keyboard([
      // ['/mex', '/cosmos'],
      // ['/home','/hide']
      [BUTTONS.bitmex.label, BUTTONS.cosmos.label, BUTTONS.hide.label],
      //['/home','/hide']
  ], {resize: true});

  return bot.sendMessage(msg.chat.id, 'How can I help you?', {replyMarkup});

});

// Hide keyboard
bot.on('/hide', msg => {
  return bot.sendMessage(
      msg.chat.id, 'Keyboard is now hidden. Type /start to re-enable.', {replyMarkup: 'hide'}
  );
});

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

//----------------------------------------------------//
//                  Keyboard - Bitmex                 //
//----------------------------------------------------//
bot.on(['/mex'], msg => {
  let replyMarkup = bot.keyboard([
    ['/. XBTUSD', '/. ETHUSD','/. XBTM19','/. XBTH19','/. ETHH19'],
    ['/. ADAH19', '/. BCHH19','/. EOSH19','/. LTCH19','/. TRXH19','/. XRPH19'],
    [BUTTONS.home.label, BUTTONS.hide.label]
  ], {resize: true});

  return bot.sendMessage(msg.chat.id, 'What would you like to query?', {parseMode: 'Markdown', replyMarkup});

});

// instrument pricing data
bot.on(/^\/. (.+)$/, (msg, props) => {
  (async function (inst) {
    inst = props.match[1];
    if (inst !== "help"){
      let symbol = "";
      if (props.match[1] === "XBTUSD" || props.match[1] === "ETHUSD" || props.match[1] === "XBTH19" || props.match[1] === "XBTZ18") {
        symbol = "$";
      } else { 
        symbol = "₿";
      }
      try {
        const result = await makeRequest('GET', 'instrument', {
          filter: { symbol: inst },
          //columns: ['currentQty', 'avgEntryPrice'],
        });
        return bot.sendMessage(msg.chat.id,`---------------${result[0].symbol}---------------\n\`Funding rate\`: ${result[0].fundingRate*100}%\n\`Market price\`: ${symbol}${result[0].markPrice}`, {parseMode: 'Markdown'});
      } catch (e) {
        console.error(e);
        };
    }
  }());
});
// *********************************************************************************
// console test
bot.on(/^\/console (.+)$/, (msg, props) => {
  (async function (inst) {
      inst = props.match[1];
      try {
        const result = await makeRequest('GET', 'instrument', {
          filter: { symbol: inst },
          //columns: ['currentQty', 'avgEntryPrice'],
        });
        console.log(result[0]);
      } catch (e) {
        console.error(e);
        };
  }());
});

//
bot.on('/xbt', (msg) => {
  (async function () {
    try {
      const result = await makeRequest('GET', 'instrument', {
        filter: { symbol: 'XBTUSD' },
        //columns: ['currentQty', 'avgEntryPrice'],
      });
      return bot.sendMessage(msg.chat.id,`---------------${result[0].symbol}---------------\nMarket price: $${result[0].markPrice}`);
    } catch (e) {
      console.error(e);
      };
  }());
});

//-----------------------------------------------------------------------------------------//
//                                       MEX End                                           //
//-----------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------//
//                                   Misc. Commands                                        //
//-----------------------------------------------------------------------------------------//

bot.on('/help', (msg) => {
  return bot.sendMessage(msg.chat.id,`\`/start\` to start using the bot.`, {parseMode: 'Markdown'});
});

bot.on('/hello', (msg) => {
    return bot.sendMessage(msg.chat.id, `Howdy, ${ msg.from.first_name }!`);
});

bot.on(['audio'], msg => {
    return bot.sendMessage(msg.chat.id, 'Dope voice you got there !');
});

// Command with arguments
bot.on(/^\/say (.+)$/, (msg, props) => {
    const text = props.match[1];
    return bot.sendMessage(msg.chat.id, text, { replyToMessage: msg.message_id });
});

bot.on('edit', (msg) => {
    return msg.reply.text('You think I didn\'t see you edit that message ?!', { asReply: true });
});

bot.on('/get_fromid', (msg) => {
  const id = msg.from.id;
  //console.log(`User:${id} initiated a test.`);
  bot.sendMessage(id, `Your from id is \`${id}\``, {parseMode: 'Markdown'});
})

bot.on('/get_chatid', (msg) => {
  const id = msg.chat.id;
  //console.log(`User:${id} initiated a test.`);
  console.log(msg);
  bot.sendMessage(id, `The chat id is \`${id}\``, {parseMode: 'Markdown', notification: false});
})

//-----------------------------------------------------------------------------------------//
//                                 Misc. Commands End                                      //
//-----------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------//
//                                          WS                                             //
//-----------------------------------------------------------------------------------------//
//***************************************//
//Load config.json                       //
//***************************************//
const config = require("./config.json");

// hub selection
// var selection = "";
// if (selection === "cosmos") {
//   hub = 'cosmos_node'; 
// } else if (selection === "iris") {
//   hub = 'iris_node'; 
// }

// Import ws module, and initialize ws connection
const WebSocket = require('ws');
let ws = new WebSocket(`ws://${config.cosmos_node.url}:${config.cosmos_node.ports[0]}/websocket`);
// Helper fxn to reinitialize ws 
const reinitWS = () => {
  ws = new WebSocket(`ws://${config.cosmos_node.url}:${config.cosmos_node.ports[0]}/websocket`);
};

// Storing util and deps
const dataUtil = require('../data-util');
const fs = require('fs');
const path = require('path');
const queryString = `tm.event='NewBlock'`;
// ws requests
// [to-do]: Make it more general for use with other queries,
// also it might make sense to use random id every time
let subscribeNewBlockMsg = {
  "jsonrpc": "2.0",
  "method": "subscribe",
  "id": "0",
  "params": {
    "query": `${queryString}`,
  },
};
// [to-do]: Try to figuire out when to send unsubscribe
// possible memory leak if WS ain't closed
let unsubscribeAllMsg = {
  "jsonrpc": "2.0",
  "method": "unsubscribe_all",
  "id": "0",
  "params": {},
};

//----------------------------------------------------//
//                       App State                    //
//----------------------------------------------------//
let subscribedValidators;
let validatorsAlertStatus;
// [to-do]: this might be better way to init
// let subscribedValidators = {'':''};
// let validatorsAlertStatus = {''-1};getid
// TODO: might be even better to use TypeScript 

const resetState = () => {
  subscribedValidators = {};
  validatorsAlertStatus = {};
}

const initState = (dirname, onFileContent, onError) => {
  resetState();
  fs.readdir(dirname, function(err, filenames) {
    if (err) {
      onError(err);
      return;
    }
    filenames.forEach(function(filename) {
      fs.readFile(dirname + filename, 'utf-8', function(err, content) {
        if (err) {
          onError(err);
          return;
        }
        console.log('Reading file', filename);
        onFileContent(filename, content);
      });
    });
  });
}

// Init state
initState(
  path.join(__dirname, '/.data/'), 
  (filename, content) => {
    // Format filename
    filename = filename.slice(0,40);
    // Extract info from file content
    let validatorInfo = content.slice(1, content.length-1).split('+');

    subscribedValidators[filename] = validatorInfo[0];
    validatorsAlertStatus[filename] = parseInt(validatorInfo[1],10);

    // debugging
    // console.log(subscribedValidators);
    // console.log(validatorsAlertStatus);
  }, 
  err => console.log);


// Helper method
const isEmpty = (object) => {
  return !object || Object.keys(object).length === 0;
}

// Number of alerts before cutoff
const ALERTS_CUTOFF = 5;

// TODO: Improve error handling method
// wrap this in bot.on('ask.valAddr', msg => { }); ???
try { 
  // open ws
  ws.on('open', wsOpen);
  // close ws
  ws.on('close', wsClose);
  // ws message
  ws.on('message', wsIncoming);
  //bot.sendMessage(id, `wsSetup executed.`);
} catch (e) {
  console.log(e);
  // unsubscribe
  ws.send(JSON.stringify(unsubscribeAllMsg));
  reinitWS();
}

function wsOpen() {
  ws.send(JSON.stringify(subscribeNewBlockMsg));
}

function wsClose() {
  console.log('WS Disconnected!');
  // Initialize ws again
  reinitWS();
}

function wsIncoming(data) {
  // DEBUG
  //console.log(data);

  let json = JSON.parse(data)
  if(isEmpty(json.result)) {
    console.log('WS Connected!');
  } else {
    //console.log(json.result.data.value.block);
    let targetValidators = Object.keys(subscribedValidators);
    targetValidators.forEach( (validator) => {
      let found = false;
      let i = 0;
      do {
        if (!isEmpty(json.result.data.value.block.last_commit.precommits[i])) {
          if (validator === json.result.data.value.block.last_commit.precommits[i].validator_address){
            found = true;
          }
        } 
        i+=1;
      } while (!found && i<json.result.data.value.block.last_commit.precommits.length)

      if (found) {
        // load firstMissedBlock
        if (validatorsAlertStatus[validator] > ALERTS_CUTOFF) {
          let firstMissedBlock = validatorsAlertStatus[validator];
          // Reset validatorsAlertStatus[validator] back to 0
          validatorsAlertStatus[validator] = 0;
          dataUtil.overwrite(`${validator}`, `${subscribedValidators[validator]}+${validatorsAlertStatus[validator]}`, (err) => {
            console.log(err, `${validator}`);
          });
          // ------ Send alert ------ //
            //console.log(subscribedValidators[validator]);
            //bot.sendMessage(subscribedValidators[validator], `${validator} is back up at height \`${json.result.data.value.block.header.height}\`. Missed \`${ALERTS_CUTOFF}\` blocks since block \`${firstMissedBlock}\`.`, {parseMode: 'Markdown', notification: false});
            bot.sendMessage(subscribedValidators[validator], `Missed \`${ALERTS_CUTOFF}\` blocks since block \`${firstMissedBlock}\`.`, {parseMode: 'Markdown', notification: false});
          }
      } else {
        // Check alert status
        // If alert status (number of conseq. blocks missed) < cutoff,
        // continue to alert this validator
        if (validatorsAlertStatus[validator] < ALERTS_CUTOFF) {
          validatorsAlertStatus[validator] += 1;
          // ------ Send alert ------ //
          bot.sendMessage(subscribedValidators[validator], `${validator} absent at height \`${json.result.data.value.block.header.height}\`.`, {parseMode: 'Markdown', notification: false});
        } else if(validatorsAlertStatus[validator] === ALERTS_CUTOFF) {
          // when alert status == cutoff, stop alerts and store firstMissedBlock in validatorsAlertStatus[validator]
          // [bug]: firstMissedBlock = (current hight - alerts_cutoff) only works when the blocks were missed consecutively
          validatorsAlertStatus[validator] = json.result.data.value.block.header.height - ALERTS_CUTOFF;
          dataUtil.overwrite(`${validator}`, `${subscribedValidators[validator]}+${validatorsAlertStatus[validator]}`, (err) => {
            console.log(err);
          });
        }
      }
    });
  }
}
//-----------------------------------------------------------------------------------------//
//                                        WS END                                           //
//-----------------------------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------//
//                                        Cosmos                                           //
//-----------------------------------------------------------------------------------------//

// Import custom http module
const HttpUtil = require('../http-util');
const httpUtil = new HttpUtil();

// Helper methods
//Custom error handling
const handleErrors = (e,chatid) => {
  //console.log(e);
  if (e.name == 'TypeError') {
    console.error(e);
    //bot.sendMessage(chatid,`${e}`); 
    bot.sendMessage(chatid,`Address can't be found on the current chain.`);
  } else {
    console.error(e);
    //bot.sendMessage(chatid,`${e}`);
    bot.sendMessage(chatid,`oops...an error occurred`);
  }
}

//----------------------------------------------------//
//                  Keyboard - Cosmos                 //
//----------------------------------------------------//
bot.on(['/cosmos','/backCosmos'], msg => {
  let replyMarkup = bot.keyboard([
      [BUTTONS.nodeQuery.label, BUTTONS.chainQuery.label],
      [BUTTONS.alerts.label, BUTTONS.lcdQuery.label],
      [BUTTONS.home.label, BUTTONS.hide.label]
  ], {resize: true});

  return bot.sendMessage(msg.chat.id, 'How can I help you?', {replyMarkup});
});

//----------------------------------------------------//
//               Keyboard - Node Queries              //
//----------------------------------------------------//
//bot.on(/^\/node (.+)$/, (msg, props) => {
bot.on(['/node_queries'], msg => {
  //const inst = props.match[1];
  //if (inst === "queries") {
    let replyMarkup = bot.keyboard([
      [BUTTONS.nodeStatus.label, BUTTONS.lastBlock.label, BUTTONS.peersCount.label, BUTTONS.peersList.label],
      [BUTTONS.mempoolFlush.label],
      [BUTTONS.backCosmos.label, BUTTONS.home.label, BUTTONS.hide.label]
  ], {resize: true});

  return bot.sendMessage(msg.chat.id, 'What would you like to query?', {replyMarkup});
  //}
});

//----------------------------------------------------//
//               Keyboard - Chain Queries             //
//----------------------------------------------------//
//bot.on(/^\/lcd (.+)$/, (msg, props) => {
bot.on(['/chain_queries'], msg => {
  //const inst = props.match[1];
  //if (inst === "queries") {
    let replyMarkup = bot.keyboard([
      [BUTTONS.consensusState.label, BUTTONS.consensusParams.label],
      [BUTTONS.validatorsCount.label, BUTTONS.validatorsList.label],
      // [BUTTONS.chainBlock.label, BUTTONS.chainTxHash.label],
      ['/block_lookup', '/tx_lookup'],
      [BUTTONS.backCosmos.label, BUTTONS.home.label, BUTTONS.hide.label]
  ], {resize: true});

  return bot.sendMessage(msg.chat.id, 'What would you like to query?', {replyMarkup});
  //}
});

//----------------------------------------------------//
//                  Keyboard - Alerts                 //
//----------------------------------------------------//
//bot.on(/^\/lcd (.+)$/, (msg, props) => {
bot.on(['/alerts'], msg => {
  //const inst = props.match[1];
  //if (inst === "queries") {
    let replyMarkup = bot.keyboard([
      ['/subscribe','/unsubscribe'],
      [BUTTONS.backCosmos.label, BUTTONS.home.label, BUTTONS.hide.label]
  ], {resize: true});

  return bot.sendMessage(msg.chat.id, 'What would you like to query?', {replyMarkup});
  //}
});

//----------------------------------------------------//
//                Keyboard - Lcd Queries              //
//----------------------------------------------------//
//bot.on(/^\/lcd (.+)$/, (msg, props) => {
bot.on(['/lcd_queries'], msg => {
  //const inst = props.match[1];
  //if (inst === "queries") {
    let replyMarkup = bot.keyboard([
      // [BUTTONS.nodeBalance.label,BUTTONS.nodeKeys.label, BUTTONS.nodeBalance.label]
      ['/account_balance', '/delegator_rewards', '/validator_rewards'],
      [BUTTONS.backCosmos.label, BUTTONS.home.label, BUTTONS.hide.label]
  ], {resize: true});

  return bot.sendMessage(msg.chat.id, 'What would you like to query?', {replyMarkup});
  //}
});

//----------------------------------------------------//
//                  Command Functions                 //
//----------------------------------------------------//
// last block
const sendLastBlock = (url, port, chatid) => {
  //console.log(url,port);
  //const chatid=msg;
  httpUtil.httpGet(url, port, '/status')
    .then(data => JSON.parse(data))
    .then(json => bot.sendMessage(chatid,`Block \`${json.result.sync_info.latest_block_height}\``, {parseMode: 'Markdown'})) 
    .catch(e => handleErrors(e, chatid));  
}

// node info
const sendNodeInfo = (url, port, chatid) => {
  httpUtil.httpGet(url, port, '/status')
    .then(data => JSON.parse(data))
    .then(json => {
    let syncedUP = ""
    if (json.result.sync_info.catching_up==false) {
      syncedUP = "*Synced Up*"
    } else {
      syncedUP = "*Not Synced Up*"
    }
    bot.sendMessage(chatid,`\`Chain\`: ${json.result.node_info.network}\n`
    +`\`id\`: ${json.result.node_info.id}\n`
    +`\`Moniker\`: ${json.result.node_info.moniker}\n`
    +`\`Address\`: ${json.result.validator_info.address}\n`
    +`\`Voting Power\`: ${json.result.validator_info.voting_power}\n`
    +`${syncedUP}\n`
    ,{parseMode: 'Markdown'})
    }) 
    .catch(e => handleErrors(e, chatid));  
}

// peers count
const sendPeersCount = (url, port, chatid) => {
  httpUtil.httpGet(url, port, '/net_info')
    .then(data => JSON.parse(data))
    .then(json => {
      bot.sendMessage(chatid,`The node has \`${json.result.n_peers}\` peers in total.`, {parseMode: 'Markdown'})
    })
    .catch(e => handleErrors(e, chatid));  
}

// peers list
const sendPeersList = (url, port, chatid) => {
  httpUtil.httpGet(url, port, '/net_info')
    .then(data => JSON.parse(data))
    .then(async json => {
      await bot.sendMessage(chatid,`\`${json.result.n_peers}\` peers total.`, {parseMode: 'Markdown'})
      let peers = json.result.peers; 
      let i = 1;
      for (let peer of peers) {
        await bot.sendMessage(chatid,`(${i})\n\`Node id\`: ${peer.node_info.id}\n`
        +`\`Moniker\`: ${peer.node_info.moniker}\n\u200b\n`, {parseMode: 'Markdown'});
        i += 1;
      }
    })
    .catch(e => handleErrors(e, chatid));  
}

// consensus state
const sendConsensusState = (url, port, chatid) => {
  httpUtil.httpGet(url, port, '/dump_consensus_state')
    .then(data => JSON.parse(data))
    .then(json => { 
      //console.log(json);
      let roundState = json.result.round_state
      bot.sendMessage(chatid,`\`Round State Height\`: ${roundState.height}\n`
        + `\`Round\`: ${roundState.round}\n`
        + `\`Step\`: ${roundState.step}\n`
        + `\`Proposer\`: ${roundState.validators.proposer.address}`, {parseMode: 'Markdown'})
    })
    .catch(e => handleErrors(e, chatid));   
}

// consensus params
const sendConsensusParams = (url, port, chatid) => {
  httpUtil.httpGet(url, port, '/status')
    .then(data => JSON.parse(data))
    .then(json => {
      let latestBlockHeight = json.result.sync_info.latest_block_height
        httpUtil.httpGet(config.cosmos_node.url, config.cosmos_node.ports[0], `/consensus_params?height=${latestBlockHeight}`)
        .then(data => JSON.parse(data))
        .then(json => {
          //console.log(json);
          bot.sendMessage(chatid,`\`Height\`: ${json.result.block_height}\n`
          + `\`Block Size\`: ${json.result.consensus_params.block_size.max_bytes}\n`
          + `\`Evidence Max Age\`: ${json.result.consensus_params.evidence.max_age}\n`
          + `\`Validator Pubkey Type(s)\`: ${json.result.consensus_params.validator.pub_key_types}\n`, {parseMode: 'Markdown'})
        });
    })
    .catch(e => handleErrors(e, chatid));   
}

// validators count
const sendValidatorsCt = (url, port, chatid) => {
  httpUtil.httpGet(url, port, '/status')
    .then(data => JSON.parse(data))
    .then(json => {
      console.log(json);
      let latestBlockHeight = json.result.sync_info.latest_block_height
      if (latestBlockHeight == 0) {
        // get validators from "/dump_consensus_state"
        httpUtil.httpGet(config.cosmos_node.url, config.cosmos_node.ports[0], '/dump_consensus_state')
        .then(data => JSON.parse(data))
        .then(json => bot.sendMessage(chatid,json.result.round_state.validators.validators.length));
      }
      else {
        // get validators from "/validators?height="
        httpUtil.httpGet(url, port, `/validators?height=${latestBlockHeight}`)
        .then(data => JSON.parse(data))
        .then(json => {
          bot.sendMessage(chatid,`There are \`${json.result.validators.length}\` validators in total at Block \`${latestBlockHeight}\`.`, {parseMode: 'Markdown'})
        });
      }
    })
    .catch(e => handleErrors(e, chatid));   
}

// validators list
const sendValidators = (url, port, chatid) => {
  httpUtil.httpGet(url, port, '/status')
    .then(data => JSON.parse(data))
    .then(json => {
      let latestBlockHeight = json.result.sync_info.latest_block_height
      if (latestBlockHeight == 0) {
        // get validators from "/dump_consensus_state"
        httpUtil.httpGet(config.cosmos_node.url, config.cosmos_node.ports[0], '/dump_consensus_state')
        .then(data => JSON.parse(data))
        .then(async json => await bot.sendMessage(chatid,json.result.round_state.validators.validators.length));
      }
      else {
        // get validators from "/validators?height="
        httpUtil.httpGet(url, port, `/validators?height=${latestBlockHeight}`)
        .then(data => JSON.parse(data))
        .then(async json => {
          await bot.sendMessage(chatid,`\`${json.result.validators.length}\` validators in total at Block \`${latestBlockHeight}\`.`, {parseMode: 'Markdown'})
          let validators = json.result.validators; 
          let total_voting_power = 0;
          let i = 1;
          for (let validator of validators) {
            await bot.sendMessage(chatid,`(${i})\n\`Address\`: ${validator.address}\n`
            +`\`Voting Power\`: ${validator.voting_power}\n`
            +`\`Proposer Priority\`: ${validator.proposer_priority}\n\u200b\n`, {parseMode: 'Markdown'});
            total_voting_power += Number(validator.voting_power);
            i++;
          }
          await bot.sendMessage(chatid,`\`Total Voting Power\`: ${total_voting_power}`, {parseMode: 'Markdown'});
        });
      }
    })
    .catch(e => handleErrors(e, chatid=msg.chat.id));   
}

// balance
const sendBalance = (addr, url, port, chatid) => {
  httpUtil.httpGet(url, port, `/bank/balances/${addr}`)
  .then(data => JSON.parse(data))
  .then(async json => {
    console.log(json);
    let i = 1;
    for (let el of json) {
      await bot.sendMessage(chatid,`(${i})\n\`${el.amount}\` ${el.denom}`,{parseMode: 'Markdown'});
      i++;
    }
  })
  .catch(e => handleErrors(e, chatid));
}

// keys
const sendKeys  = (url, port, chatid) => {
  httpUtil.httpGet(url, port, '/keys')
    .then(data => JSON.parse(data))
    .then(async json => {
      //console.log(json);
      let i = 1;
      for (let acc of json) {
        await bot.sendMessage(chatid,`(${i})\n\`Name\`: ${acc.name}\n`
          +`\`Address\`: ${acc.address}\n`
          +`\`Public Key\`: ${acc.pub_key}\n\u200b\n`,{parseMode: 'Markdown'});
        i++;
      }
    }) 
    .catch(e => handleErrors(e, chatid));
}

// delegator rewards
const sendDelRewards = (addr, url, port, chatid) => {
  httpUtil.httpGet(url, port, `/distribution/delegators/${addr}/rewards`)
  .then(data => JSON.parse(data))
  .then(async json => {
      console.log(json);
      await bot.sendMessage(chatid,`${json[0].amount}\` ${json[0].denom}\``,{parseMode: 'Markdown'});
  })
  .catch(e => handleErrors(e, chatid));
}

// valiator rewards
const sendValRewards = (addr, url, port, chatid) => {
  httpUtil.httpGet(url, port, `/distribution/validators/${addr}/rewards`)
  .then(data => JSON.parse(data))
  .then(async json => {
      console.log(json);
      await bot.sendMessage(chatid,`${json[0].amount}\` ${json[0].denom}\``,{parseMode: 'Markdown'});
  })
  .catch(e => handleErrors(e, chatid));
}

// tx by hash
const sendTxByHash  = (hash, url, port, chatid) => {
  httpUtil.httpGet(url, port, `/tx?hash=0x${hash}`)
    .then(data => JSON.parse(data))
    .then(async json => {
      //console.log(json)
      if (json.error) {
        await bot.sendMessage(chatid,json.error.data);
      } else {
        await bot.sendMessage(chatid,`\`Gas wanted\`: ${json.result.tx_result.gasWanted}\n`
        +`\`Gas used\`: ${json.result.tx_result.gasUsed}\n\u200b\n`, {parseMode: 'Markdown'});
      }
    })
    .catch(e => handleErrors(e, chatid));
}

// tx by height (=height); No dedicated buttion
const sendTxByHeight  = (height, url, port, chatid) => {
  httpUtil.httpGet(url, port, `/tx_search?query="tx.height=${height}"&per_page=30`)
    .then(data => JSON.parse(data))
    .then(async json => {
      //console.log(json);
      if (json.result.txs[0] && json.result.txs[0].height == height) {   
        let i = 0;
        do {
          // await bot.sendMessage(chatid,`\`${json.result.total_count}\` tx(s) in total in this block.\n\u200b\n`
          //   +`(${i+1})\n\`Tx Hash\`: ${json.result.txs[i].hash}\n`
          //   +`\`Gas Wanted\`: ${json.result.txs[i].tx_result.gasWanted}\n`
          //   +`\`Gas USed\`: ${json.result.txs[i].tx_result.gasUsed}\n\u200b\n`, {parseMode: 'Markdown'});
          await bot.sendMessage(chatid,`Transactions\n\u200b\n`
            + `(${i+1})\n\`Tx Hash\`: ${json.result.txs[i].hash}\n`
            +`\`Gas Wanted\`: ${json.result.txs[i].tx_result.gasWanted}\n`
            +`\`Gas USed\`: ${json.result.txs[i].tx_result.gasUsed}\n\u200b\n`, {parseMode: 'Markdown'});

          i++;
        } while(json.result.txs[i].height == height)
      }
    })
    // [bug] TypeError: Cannot read property 'height' of undefined
    .catch(e => handleErrors(e, chatid));
    //.catch(e => console.log(e));
}

// block
const sendBlockInfo  = (height, url, port, chatid) => {
  httpUtil.httpGet(url, port, `/block?height=${height}`)
    .then(data => JSON.parse(data))
    .then(async json => {
      //console.log(json)
      if (json.error) {
        await bot.sendMessage(chatid,json.error.data);
      } else {
        await bot.sendMessage(chatid,`\`${json.result.block.header.num_txs}\` tx(s) in total in this block.\n\u200b\n`
        + `\`Block Hash\`: ${json.result.block_meta.block_id.hash}\n`
        +`\`Proposer\`: ${json.result.block.header.proposer_address}\n`
        +`\`Evidence\`: ${json.result.block.evidence.evidence}\n\u200b\n`, {parseMode: 'Markdown'});
        // Send treansactions
        //await bot.sendMessage(chatid,`**Transactions**:\n`)
        sendTxByHeight(height, url=config.cosmos_node.url, port=config.cosmos_node.ports[0], chatid);
      }
    })
     .catch(e => handleErrors(e, chatid));
    //.catch(e => console.log(e));
}

//----------------------------------------------------//
//               Command Functions Calls              //
//----------------------------------------------------//
// last block
//bot.on(/^\/last (.+)$/, (msg, props) => {
  bot.on('/last_block', (msg) => {
  //const inst = props.match[1];
  //if (inst === "block") {
    sendLastBlock(url = config.cosmos_node.url, port = config.cosmos_node.ports[0], chatid= msg.chat.id);
  //}
});

// node info
  bot.on('/node_status', (msg) => {
    sendNodeInfo(url=config.cosmos_node.url, port=config.cosmos_node.ports[0], chatid=msg.chat.id);
});

// peers count
  bot.on('/peers_count', (msg) => {
    sendPeersCount(url=config.cosmos_node.url, port=config.cosmos_node.ports[0], chatid=msg.chat.id);
});

// peers list
  bot.on('/peers_list', (msg) => {
    sendPeersList(url=config.cosmos_node.url, port=config.cosmos_node.ports[0], chatid=msg.chat.id);
});

// consensus state
bot.on('/consensus_state', (msg) => {
  sendConsensusState(url=config.cosmos_node.url, port=config.cosmos_node.ports[0], chatid=msg.chat.id);
});

// consensus params
bot.on('/consensus_params', (msg) => {
  sendConsensusParams(url=config.cosmos_node.url, port=config.cosmos_node.ports[0], chatid=msg.chat.id);
});

// validators count
  bot.on('/validators_count', (msg) => {
    sendValidatorsCt(url=config.cosmos_node.url, port=config.cosmos_node.ports[0], chatid=msg.chat.id);
});

// validators list
  bot.on('/validators_list', (msg) => {
    sendValidators(url=config.cosmos_node.url, port=config.cosmos_node.ports[0], chatid=msg.chat.id);
});

// balance
bot.on('/account_balance', async (msg) => {
  return bot.sendMessage(msg.chat.id, `Please provide an address.\nExample: \`cosmos1j3nlv8wcfst2mezkny4w2up76wfgnkq744ezus\``, {ask: 'accountBalance'}, {parseMode: 'Markdown'});
});

bot.on('ask.accountBalance', async msg => {
  const addr = msg.text;
  const id = msg.chat.id;
  if (addr.length !== 45) {
    return bot.sendMessage(id, 'Address is invalid!');
  } else {
    sendBalance (addr, url=config.cosmos_node.url, port=config.cosmos_node.ports[2], id)
  }
});

// keys
  bot.on('/node_keys', (msg) => {
    sendKeys(url=config.cosmos_node.url, port=config.cosmos_node.ports[2], chatid=msg.chat.id);
});

// delegator rewards
bot.on('/delegator_rewards', async (msg) => {
  return bot.sendMessage(msg.chat.id, `Please provide a delagator address.\nExample: \`cosmos1j3nlv8wcfst2mezkny4w2up76wfgnkq744ezus\``, {ask: 'delegatorRewwards'}, {parseMode: 'Markdown'});
});

bot.on('ask.delegatorRewwards', async msg => {
  const addr = msg.text;
  const id = msg.chat.id;
  if (addr.length !== 45) {
    return bot.sendMessage(id, 'Address is invalid!');
  } else {
    sendDelRewards (addr, url=config.cosmos_node.url, port=config.cosmos_node.ports[2], id)
  }
});

// validator rewards
bot.on('/validator_rewards', async (msg) => {
  return bot.sendMessage(msg.chat.id, `Please provide a validator address.\nExample: \`cosmosvaloper1j3nlv8wcfst2mezkny4w2up76wfgnkq7spdhsr\``, {ask: 'validatorRewwards'}, {parseMode: 'Markdown'});
});

bot.on('ask.validatorRewwards', async msg => {
  const addr = msg.text;
  const id = msg.chat.id;
  if (addr.length !== 52) {
    return bot.sendMessage(id, 'Address is invalid!');
  } else {
    sendValRewards (addr, url=config.cosmos_node.url, port=config.cosmos_node.ports[2], id)
  }
});

// tx by hash
bot.on('/tx_lookup', async (msg) => {
    return bot.sendMessage(msg.chat.id, `Please provide a tx hash.`, {ask: 'txByHash'});
});

bot.on('ask.txByHash', async msg => {
  const txHash = msg.text;
  //console.log(blockHeight);
  const id = msg.chat.id;
  sendTxByHash (txHash, url=config.cosmos_node.url, port=config.cosmos_node.ports[0], id)
});

// tx by height
bot.on('/chain_tx_height', async (msg) => {
    return bot.sendMessage(msg.chat.id, `Please provide a block height.`, {ask: 'txByHeight'});
});

bot.on('ask.txByHeight', async msg => {
  const height = msg.text;
  //console.log(blockHeight);
  const id = msg.chat.id;
  sendTxByHeight (height, url=config.cosmos_node.url, port=config.cosmos_node.ports[0], id)
});

// block
bot.on('/block_lookup', async (msg) => {
    return bot.sendMessage(msg.chat.id, `Please provide a block height.`, {ask: 'blockHeight'});
});

bot.on('ask.blockHeight', async msg => {
  //console.log(msg)
  const blockHeight = msg.text;
  // [bug] blockHeight reads "Block Lookup", which really should be the block height# the user enters.
  //console.log(blockHeight);
  const id = msg.chat.id;
  sendBlockInfo (blockHeight, url=config.cosmos_node.url, port=config.cosmos_node.ports[0], id)
});

// mempool flush
  bot.on('/mempool_flush', (msg) => {
    const mempoolFlush  = (url, port, chatid) => {
      httpUtil.httpGet(url, port, '/unsafe_flush_mempool')
        .then(data => {
            console.log(data);
            bot.sendMessage(chatid,`Done!`);
        }) 
        .catch(e => handleErrors(e, chatid=msg.chat.id)); 
    }
    mempoolFlush(url=config.cosmos_node.url, port=config.cosmos_node.ports[0], chatid=msg.chat.id);
  //}
});

// subscribe
bot.on('/subscribe', (msg) => {
  return bot.sendMessage(msg.chat.id, `What\'s the validator\'s HEX address?`, {ask: 'valAddr'});
});

bot.on('ask.valAddr', msg => {
  const valAddr = msg.text;
  //console.log(valAddr);
  const id = msg.chat.id;

  if (valAddr.length !== 40) {
    return bot.sendMessage(id, 'Address is invalid!');
  }

  if (isEmpty(subscribedValidators[valAddr])) {
      // [to-do]: Implement validator address check
      dataUtil.init(`${valAddr}`, `${id}+0`, (err) => {
        console.log(err);
      });
      subscribedValidators[valAddr] = id;
      validatorsAlertStatus[valAddr] = 0;
  } else {
      dataUtil.overwrite(`${valAddr}`, `${id}+0`, (err) => {
        console.log(err);
      });
      subscribedValidators[valAddr] = id; 
      validatorsAlertStatus[valAddr] = 0;         
  }
  return bot.sendMessage(id, `You subscribed updates for validator: \`${valAddr}\``, {parseMode: 'Markdown'});
});


// subscribe
bot.on('/unsubscribe', (msg) => {
  return bot.sendMessage(msg.chat.id, `What\'s the validator\'s address?`, {ask: 'valAddrUnsub'});
});

const removeValidator = (address) => {

  fs.unlink(
    path.join(__dirname, '/.data/', `${address}.json`), (err, data) => {
      // TODO: handle differntly
      if (err) console.log;
      // Reinit state
      initState(path.join(__dirname, '/.data/'), (filename, content) => {
        // Format filename
        filename = filename.slice(0,40);
        // Extract info from file content
        let validatorInfo = content.slice(1, content.length-1).split('+');

        subscribedValidators[filename] = validatorInfo[0];
        validatorsAlertStatus[filename] = parseInt(validatorInfo[1],10);

        // debugging
        // console.log(subscribedValidators);
        // console.log(validatorsAlertStatus);
      }, 
      err => console.log); 
  });
  
}

bot.on('ask.valAddrUnsub', msg => {
  if (msg.text.length !== 40) {
    return bot.sendMessage(msg.chat.id, 'Address is invalid!');
  }
  removeValidator(msg.text);
  // return bot.sendMessage(msg.chat.id, 'Done!');
  return bot.sendMessage(msg.chat.id, `Unsubscribed from updates!`);
});

//-----------------------------------------------------------------------------------------//
//                                      Cosmos End                                         //
//-----------------------------------------------------------------------------------------//

bot.connect();