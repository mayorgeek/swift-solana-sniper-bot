// bot.js

import { Connection, PublicKey, clusterApiUrl, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { Telegraf } from 'telegraf';
import fetch from 'node-fetch';
import bs58 from 'bs58'; // Import bs58 to decode the private key
import dotenv from 'dotenv';

dotenv.config();

// Load environment variables
const BOT_TOKEN = '7282557744:AAGsP17ft-rU9kh0mDwR_ckuiSi7RRTmgLw';
const SOLANA_NETWORK = 'mainnet-beta';
const SOLANA_RPC_URL = 'https://solana-mainnet.g.alchemy.com/v2/QLDgrip-lUlxmAJnEMbNlgEB8-FvhIss';
// let TARGET_MINT_ADDRESS = process.env.TARGET_MINT_ADDRESS;
let TARGET_MINT_ADDRESS = '';
let BUY_PRICE_THRESHOLD = '0.1';

// Private key (base58 encoded) provided by the user
let PRIVATE_KEY = '41DP6aJYvWbaTFEwyyHzpA4iNKmVTKpkMpN8hWiukpZuMCWFpVqAQXX87i4BFDDsk9z5MkiUKetJYqmLhwf6F83r';

// Decode the private key from base58 and create a Keypair
let sniperKeyPair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));

// Create a Solana connection
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Set up Telegram bot
const bot = new Telegraf(BOT_TOKEN);

// Define bot commands
const commands = [
  { command: 'start', description: 'Start the bot' },
  { command: 'snipe', description: 'Begin sniping for token listings' },
  { command: 'set_mint_address', description: 'Set the address for the target token' },
  { command: 'set_threshold', description: 'Set the buy price threshold' },
  { command: 'add_wallet', description: 'Add your own wallet for sniping' },
];

// Register commands with Telegram
bot.telegram.setMyCommands(commands)
  .then(() => console.log('Bot commands registered with Telegram'))
  .catch((error) => console.error('Error registering commands:', error));

// Function to listen for token listings
async function listenForListings(ctx) {
  console.log('Listening for new token listings...');

  setInterval(async () => {
    try {
      // Fetch the 100 trending tokens
      const response = await fetch('https://api.solanatracker.io/tokens/trending');
      const listings = await response.json();

      for (const listing of listings) {
        console.log(listing);
        // if (listing.address === TARGET_MINT_ADDRESS && listing.price.toFixed(6) <= BUY_PRICE_THRESHOLD) {
        if (listing.price.toFixed(6) <= BUY_PRICE_THRESHOLD) {
          const res1 = `Found listing ${listing.name} (${listing.symbol}) at ${listing.price.toFixed(6)} SOL, attempting to buy...`;
          ctx.reply(res1);
          console.log(res1);

          const transaction = await createBuyTransaction(listing.address);
          const signature = await sendTransaction(transaction);

          const res2 = `Transaction sent! Signature: ${signature}`;
          ctx.reply(res2);
          console.log(res2);
          // Optionally, break or return if you only want to snipe once
        }
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  }, 10000); // Poll every 10 seconds
}

// Function to create a buy transaction
async function createBuyTransaction(sellerPublicKey) {
  const transaction = new Transaction();

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: sniperKeyPair.publicKey,
      toPubkey: new PublicKey(sellerPublicKey),
      lamports: BUY_PRICE_THRESHOLD * 1e9, // Convert SOL to lamports
    })
  );

  return transaction;
}

// Function to sign and send the transaction
async function sendTransaction(transaction) {
  const signature = await connection.sendTransaction(transaction, [sniperKeyPair]);
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}


// Handle Telegram commands
bot.command('start', (ctx) => {
    const message = `

<b>Welcome to the Swift Solana Sniper Bot!</b>

Solana's fastest bot to snipe any coin (SPL token)


<b>How to use this bot 🤔 (Step-by-step):</b>


1) Fund your own existing wallet.


2) Use /add_wallet to add your own wallet address for sniping.


3) Use /set_mint_address [<i>token_address</i>] to set the address of the token that you would like to snipe.


4) Use /set_threshold [<i>threshold_number</i>] to set the buy price threshold.


5) Use /snipe to start sniping.

    `;

    ctx.telegram.sendMessage(ctx.chat.id, message, {parse_mode: "HTML"});
});

bot.command('snipe', async (ctx) => {
    if (TARGET_MINT_ADDRESS === '') {
        ctx.reply('You are yet to set a Mint Address for sniping. Use /set_mint_address');
        return;
    }
    ctx.reply('Sniper bot is starting to listen for listings...');
    await listenForListings(ctx);
});

bot.command('set_mint_address', (ctx) => {
    if (ctx.payload !== '') {
        TARGET_MINT_ADDRESS = ctx.payload;
        ctx.reply(`The mint address has been set to ${TARGET_MINT_ADDRESS}`);
    } else {
        const message = `

<b>Here is how to set the mint address:</b>

1) Copy the address of the token that you want to target for sniping.

2) Use /set_mint_address [<i>token_address</i>] to set the address of the token that you would like to snipe.

Example:

/set_mint_address EyPLpupG6zKfKc9L6uGZmTo9hBjZp9Fe4XmEoZxX3kHe

        `;
        ctx.telegram.sendMessage(ctx.chat.id, message, {parse_mode: "HTML"});
    }
});

bot.command('set_threshold', async (ctx) => {
    if (ctx.payload !== '') {
        BUY_PRICE_THRESHOLD = parseFloat(ctx.payload);
        ctx.reply(`The buy price threshold has been set to ${BUY_PRICE_THRESHOLD} SOL`);
    } else {
        const message = `

<b>Here is how to set the buy price threshold:</b>

1) Use /set_threshold [<i>threshold_number</i>] to set the buy price threshold.

Example:

/set_threshold 0.000004


Where, the <i>threshold_number</i> is the amount of SOL to be used as the threshold which is 0.000004 SOL in this example.
The threshold amount should be to 6 decimal places.

        `;
        ctx.telegram.sendMessage(ctx.chat.id, message, {parse_mode: "HTML"});
    }
});


bot.command('add_wallet', (ctx) => {
    if (ctx.payload !== '') {
        PRIVATE_KEY = ctx.payload;
        sniperKeyPair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
        ctx.reply(`Your wallet ${sniperKeyPair.publicKey} is now been used for sniping`);
        console.log(`Your wallet ${sniperKeyPair.publicKey} is now been used for sniping`);
    } else {
        const message = `

<b>Here is how to add your own wallet for sniping:</b>

1) Copy the private key of the wallet that you want to use for sniping.

2) Use /add_wallet [<i>private_key</i>] to add your wallet for sniping.

Example:

/add_wallet 41DP6aJYvWbaTFEwyyHzpA4iNKmVTKpkMpN8hWiukpZuMCWFpVqAQXX87i4BFDDsk9z5MkiUKetJYqmLhwf6F83r


Kindly note that your private key is not been saved on our server. Therefore, you might be required to add your wallet again.

        `;
        ctx.telegram.sendMessage(ctx.chat.id, message, {parse_mode: "HTML"});
    }
});


bot.on('text', (ctx) => {
  ctx.reply('Send /snipe to start listening for token listings.');
});

// Start the bot
bot.launch()
  .then(() => console.log('Telegram bot is running...'))
  .catch((error) => console.error('Error launching Telegram bot:', error));

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
