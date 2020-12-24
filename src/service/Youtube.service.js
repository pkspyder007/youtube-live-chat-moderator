const path = require("path");
const { google } = require("googleapis");
const util = require("util");
const fs = require("fs");
const youtube = google.youtube("v3");
const OAuth2 = google.auth.OAuth2;

const writeFilePromise = util.promisify(fs.writeFile);
const readFilePromise = util.promisify(fs.readFile);

// utils
const save = async (path, str) => {
  await writeFilePromise(path, str);
  console.log("Successfully Saved");
};

const read = async (path) => {
  const fileContents = await readFilePromise(path);
  return JSON.parse(fileContents);
};

// Permissions needed to view and submit live chat comments
const scope = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl'
  ];

class YoutubeModerator {
    constructor() {
        this.clientId = process.env.CLIENT_ID;
        this.clientSecret = process.env.CLIENT_SECRET;
        this.redirectURI = "http://localhost:3000/callback";
        this.liveChatId; 
        this.nextPage; 
        this.intervalTime = 5000; 
        this.interval; 
        this.chatMessages = []; 
        console.log(this.clientId);
        this.auth = new OAuth2(this.clientId, this.clientSecret, this.redirectURI);

        // Update the tokens automatically when they expire
        this.auth.on('tokens', tokens => {
            try {
                if (tokens.refresh_token) {
                    // store the refresh_token in my database!
                    save('./tokens.json', JSON.stringify(auth.tokens));
                    console.log(tokens.refresh_token);
                }
                console.log(tokens.access_token);
            } catch (error) {
                console.log("Error in auth.on in constructor");
                console.log(error.message);
            }
        });

        this.checkTokens();
  }

  // Get tokens from files if exists
  async checkTokens() {
    try {
      const fileContents = await readFilePromise(
        path.join(process.cwd(), "src", "tokens.json")
      );
      const tokens = JSON.parse(fileContents);
      if (tokens) {
        this.auth.setCredentials(tokens);
        console.log("tokens set");
      } else {
        console.log("No tokens found. Please authorise the app first.");
      }
    } catch (error) {
      console.log("Error in checkToken function");
      console.log(error.message);
    }
  }

  getAuthCode(res) {
    try {
      const authUrl = this.auth.generateAuthUrl({
        access_type: "offline",
        scope,
      });
      res.redirect(authUrl);
    } catch (error) {
      console.log("Error in getAuthCode function");
      console.log(error.message);
    }
  }

  async getTokensFromAuthCode(code) {
    try {
      const credentials = await this.auth.getToken(code);
      this.authorize(credentials);
    } catch (error) {
      console.log("Error in getTokensFromAuthCode function");
      console.log(error.message);
    }
  }

  authorize({ tokens }) {
    try {
      this.auth.setCredentials(tokens);
      console.log("Successfully set credentials");
      save(
        path.join(process.cwd(), "src", "tokens.json"),
        JSON.stringify(tokens)
      );
    } catch (error) {
      console.log("Error in authorize function");
      console.log(error.message);
    }
  }

  async findActiveChat() {
      try {
        const response = await youtube.liveBroadcasts.list({
            auth: this.auth,
            part: 'snippet',
            mine: 'true'
          });
          const latestChat = response.data.items[0];
        
          if (latestChat && latestChat.snippet.liveChatId) {
            this.liveChatId = latestChat.snippet.liveChatId;
            console.log("Chat ID Found:", this.liveChatId);
            return "Live chat found.";
          } else {
            console.log("No Active Chat Found");
            return "No Active Chat Found";
          }
      } catch (error) {
        console.log("Error in findActiveChat function");
        console.log(error.message);
      }
  }

  respond(newMessages){
    try {
        newMessages.forEach(message => {
            const messageText = message.snippet.displayMessage.toLowerCase();
            // Need to work on a better entity matching algorithm
            if (messageText.includes('bad word')) {
              const author = message.authorDetails.displayName;
              const response = `${author}!, be respectful in the chat!! you will be banned next time for such activity`;
              this.insertMessage(response);
            }
          });
    } catch (error) {
        console.log("Error in respond function");
        console.log(error.message);
    }
  };

  async getChatMessages() {
      try {
        if(!this.liveChatId) {
          console.log("No live chat id found. Aborting chat tracking");
          return false;
        }
        const response = await youtube.liveChatMessages.list({
            auth: this.auth,
            part: 'snippet,authorDetails',
            liveChatId: this.liveChatId,
            pageToken: this.nextPage
          });
          const { data } = response;
          const newMessages = data.items;
          this.chatMessages.push(...newMessages);
          nextPage = data.nextPageToken;
          console.log('Total Chat Messages:', this.chatMessages.length);
          respond(newMessages);
      } catch (error) {
        console.log("Error in this.getChatMessages function");
        console.log(error.message);
      }
  }

  insertMessage(messageText) {
      try {
        youtube.liveChatMessages.insert(
            {
              auth: this.auth,
              part: 'snippet',
              resource: {
                snippet: {
                  type: 'textMessageEvent',
                  liveChatId: this.liveChatId,
                  textMessageDetails: {
                    messageText
                  }
                }
              }
            },
            () => {
                console.log('NEW Message sent!!!');
            }
          ); 
      } catch (error) {
          
      }
  }

  startTrackingChat() {
    this.interval = setInterval(this.getChatMessages, this.intervalTime);
  };
  
  stopTrackingChat() {
    clearInterval(this.interval);
  };
};


module.exports = YoutubeModerator;