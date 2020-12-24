const { google } = require("googleapis");
const dotenv = require("dotenv");
dotenv.config();

let liveChatId; // Where we'll store the id of our liveChat
let nextPage; // How we'll keep track of pagination for chat messages
const intervalTime = 5000; // Miliseconds between requests to check chat messages
let interval; // variable to store and control the interval that will check messages
let chatMessages = []; // where we'll store all messages

const youtube = google.youtube("v3");
const OAuth2 = google.auth.OAuth2;

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
// const redirectURI = 'http://localhost:3000/callback';

// Permissions needed to view and submit live chat comments
const scope = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.force-ssl",
];

const auth = new OAuth2(
  clientId,
  clientSecret,
  "https://developers.google.com/oauthplayground"
);

const youtubeService = {};

// Storing access tokens received from google in auth object
youtubeService.authorize = () => {
  auth.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
  const myAccessToken = auth.getAccessToken();
  console.log("Successfully set credentials");
};

youtubeService.findActiveChat = async () => {
  try {
    const response = await youtube.liveBroadcasts.list({
      auth,
      part: "snippet",
      mine: "true",
    });
    const latestChat = response.data.items[0];

    if (latestChat && latestChat.snippet.liveChatId) {
      liveChatId = latestChat.snippet.liveChatId;
      console.log("Chat ID Found:", liveChatId);
    } else {
      console.log("No Active Chat Found");
    }
  } catch (error) {
      console.log("===================================");
      console.log(error);
      console.log("===================================");
  }
};

const respond = (newMessages) => {
  newMessages.forEach((message) => {
    const messageText = message.snippet.displayMessage.toLowerCase();
    if (messageText.includes("fuck")) {
      const author = message.authorDetails.displayName;
      const response = `${author}!, Please be respectful in the chat else you will be banned....`;
      youtubeService.insertMessage(response);
    }
  });
};

const getChatMessages = async () => {
  try {
    const response = await youtube.liveChatMessages.list({
        auth,
        part: "snippet,authorDetails",
        liveChatId,
        pageToken: nextPage,
      });
      const { data } = response;
      const newMessages = data.items;
      chatMessages.push(...newMessages);
      nextPage = data.nextPageToken;
      console.log("Total Chat Messages:", chatMessages.length);
      respond(newMessages);
  } catch (error) {
    console.log("===================================");
    console.log(error);
    console.log("===================================");
    clearInterval(interval)
  }
};

youtubeService.startTrackingChat = () => {
  interval = setInterval(getChatMessages, intervalTime);
};

youtubeService.stopTrackingChat = () => {
  clearInterval(interval);
};

youtubeService.insertMessage = (messageText) => {
  youtube.liveChatMessages.insert(
    {
      auth,
      part: "snippet",
      resource: {
        snippet: {
          type: "textMessageEvent",
          liveChatId,
          textMessageDetails: {
            messageText,
          },
        },
      },
    },
    () => {}
  );
};

let main = async () => {
  youtubeService.authorize();
  await youtubeService.findActiveChat();
  youtubeService.startTrackingChat();

  youtubeService.insertMessage("New msg from mod bot");
};

main();

setTimeout(() => {
  youtubeService.stopTrackingChat();
}, 1000 * 60 * 60 * 3);

// module.exports = youtubeService;
