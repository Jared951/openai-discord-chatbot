// Load environment variables from a .env file
require('dotenv/config');

// Import required modules and libraries
const { Client } = require('discord.js');
const { OpenAI } = require('openai');

// Create a new Discord bot client
const client = new Client({
    // Define the bot's intents for interaction with Discord servers
    intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent']
});

// Event handler: when the bot is ready, log a message
client.on('ready', () => {
    console.log('The bot is online.');
});

// Define constants for prefix and specific channels
const IGNORE_PREFIX = "!";
// Copy/Paste the channel ID from Discord for the bot to interact in
const CHANNELS = ['1149513688903065736'];

// Create an instance of the OpenAI API client using the provided API key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY // Store the API key in an environment variable
});

// Event handler: when a message is created in a Discord channel
client.on('messageCreate', async (message) => {
    // Ignore messages from other bots
    if (message.author.bot) return;
    // Ignore messages that start with the defined prefix
    if (message.content.startsWith(IGNORE_PREFIX)) return;
    // Check if the message is in one of the specified channels or mentions the bot
    
    if (!CHANNELS.includes(message.channelId) && !message.mentions.users.has(client.user.id)) return;

    // Indicate that the bot is typing a response
    await message.channel.sendTyping();

    // Set up an interval to send typing indicators every 5 seconds
    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping();
    }, 5000);

    // Create an array to store the conversation history
    let conversation = [];
    // Add a system message to indicate that the bot is a chatbot
    conversation.push({
        role: 'system',
        content: 'Chat GPT is a chatbot.'
    });

    // Fetch the 10 previous messages in the channel
    let prevMessages = await message.channel.messages.fetch({ limit: 10 })
    prevMessages.reverse();

    // Process previous messages
    prevMessages.forEach((msg) => {
        // Skip messages from other bots and those starting with the prefix
        if (msg.author.bot && msg.author.id !== client.user.id) return; 
        if (msg.content.startsWith(IGNORE_PREFIX)) return;

        // Replace spaces and special characters in usernames
        const username = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');

        // Add user and assistant messages to the conversation history
        if (msg.author.id === client.user.id) {
            conversation.push({
                role: 'assistant',
                name: username,
                content: msg.content
            });

            return;
        }

        conversation.push({
            role: 'user',
            name: username,
            content: msg.content
        });
    });
    
    // Generate a response from the OpenAI API based on the conversation history
    const response = await openai.chat.completions
        .create({
            model: 'gpt-3.5-turbo',
            messages: conversation
        })
        .catch((error) => console.error('OpenAI Error:\n', error));

    // Clear the typing interval
    clearInterval(sendTypingInterval);

    // Handle cases where there is no response from the OpenAI API
    if (!response){
        message.reply(`I'm having some trouble with the OpenAI API. Try again in a moment.`);
        return;
    }

    // Split and send the response in chunks to avoid message length limit
    const responseMessage = response.choices[0].message.content;
    const chunkSizeLimit = 2000;

    for (let i = 0; i < responseMessage.length; i += chunkSizeLimit) {
        const chunk = responseMessage.substring(i, i + chunkSizeLimit);
    
        await message.reply(chunk);
    }
    
    // Reply with the full response from the OpenAI API
    message.reply(response.choices[0].message.content);
});

// Log in the bot using the provided Discord bot token
client.login(process.env.TOKEN);