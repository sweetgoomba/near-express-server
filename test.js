const line = require('@line/bot-sdk');
const config = {
  channelAccessToken: 'YOUR_CHANNEL_ACCESS_TOKEN',
  channelSecret: 'YOUR_CHANNEL_SECRET',
};
const client = new line.Client(config);

// This object keeps track of the conversation state
const conversationState = {};

// This function sends a message with buttons to prompt the user for input
async function askQuestion(replyToken) {
  const message = {
    type: 'template',
    altText: 'Please select an option',
    template: {
      type: 'buttons',
      text: 'Please select an option',
      actions: [
        {
          type: 'message',
          label: 'Option 1',
          text: 'Option 1',
        },
        {
          type: 'message',
          label: 'Option 2',
          text: 'Option 2',
        },
      ],
    },
  };
  await client.replyMessage(replyToken, message);
  // Update the conversation state to indicate that the chatbot is expecting a response
  conversationState[replyToken] = 'expecting_response';
}

// This function handles incoming messages and checks if it is the expected response
async function handleMessage(event) {
  const { message, replyToken } = event;
  const currentState = conversationState[replyToken];
  
  if (currentState === 'expecting_response') {
    // If the chatbot is expecting a response, process the message and continue the conversation
    if (message.type === 'text') {
      const userResponse = message.text;
      if (userResponse === 'Option 1') {
        // Handle Option 1
        await client.replyMessage(replyToken, { type: 'text', text: 'You selected Option 1' });
      } else if (userResponse === 'Option 2') {
        // Handle Option 2
        await client.replyMessage(replyToken, { type: 'text', text: 'You selected Option 2' });
      } else {
        // If the response is not expected, send a clarification message
        await client.replyMessage(replyToken, { type: 'text', text: 'Sorry, I didn\'t understand your response. Please try again.' });
      }
      // Update the conversation state to indicate that the chatbot is not expecting a response
      conversationState[replyToken] = undefined;
    }
  } else {
    // If the chatbot is not expecting a response, ask the initial question
    await askQuestion(replyToken);
  }
}

// This function handles incoming webhook events
async function handleWebhook(req, res) {
  const events = req.body.events;
  const results = await Promise.all(events.map(async (event) => {
    try {
      if (event.type === 'message') {
        await handleMessage(event);
      }
    } catch (err) {
      console.error(err);
    }
  }));
  res.status(200).send('OK');
}

// Start the server
const express = require('express');
const app = express();
app.use(express.json());
app.post('/webhook', handleWebhook);
app.listen(process.env.PORT || 3000, () => {
  console.log('Server started');
});