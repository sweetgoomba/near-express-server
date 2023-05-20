const express = require('express');
const axios = require('axios');

const LINE_API_URL = 'https://api.line.me/v2/bot/message/reply';
const CHANNEL_ACCESS_TOKEN = 'YOUR_CHANNEL_ACCESS_TOKEN';

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  const events = req.body.events;
  Promise.all(events.map(handleEvent))
    .then(() => res.sendStatus(200))
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    const userMessage = event.message.text;
    const replyToken = event.replyToken;

    // Check conversation state and expected response
    const conversationState = retrieveConversationState(event.source.userId);
    if (conversationState === 'expecting_reply') {
      // Continue the conversation based on the user's response
      processUserResponse(userMessage, event.source.userId, replyToken);
    } else {
      // Start a new conversation or handle the message accordingly
      startNewConversation(userMessage, event.source.userId, replyToken);
    }
  }
}

function startNewConversation(message, userId, replyToken) {
  // Ask a question or prompt the user for input
  const questionMessage = {
    type: 'text',
    text: 'Please provide your answer:',
  };

  // Store conversation state
  storeConversationState(userId, 'expecting_reply');

  // Send the question message
  return replyMessage(replyToken, questionMessage);
}

function processUserResponse(response, userId, replyToken) {
  // Handle the user's response based on the conversation state
  // ... Your logic to process the user's response ...

  // Send a reply message or ask another question
  const replyMessage = {
    type: 'text',
    text: 'Thank you for your answer! How can I assist you further?',
  };

  // Clear conversation state
  clearConversationState(userId);

  // Send the reply message
  return replyMessage(replyToken, replyMessage);
}

function replyMessage(replyToken, message) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
  };

  const body = {
    replyToken,
    messages: [message],
  };

  return axios.post(LINE_API_URL, body, { headers });
}

// Helper functions to store and retrieve conversation state (using a simple in-memory storage for demonstration purposes)

const conversationStateMap = new Map();

function storeConversationState(userId, state) {
  conversationStateMap.set(userId, state);
}

function retrieveConversationState(userId) {
  return conversationStateMap.get(userId);
}

function clearConversationState(userId) {
  conversationStateMap.delete(userId);
}

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
