const express = require('express');
const path = require('path');
require("dotenv").config();

const YoutubeMOD = require('./service/Youtube.service.js');
const ytmod = new YoutubeMOD();

const app = express();

app.get('/', (req, res) =>
  res.sendFile(path.join(process.cwd(), 'src/public/index.html'))
);

app.get('/authorize', (request, response) => {
  console.log('/auth');
  ytmod.getAuthCode(response);
});

app.get('/callback', (req, response) => {
  const { code } = req.query;
  ytmod.getTokensFromAuthCode(code);
  response.redirect('/');
});

app.get('/find-active-chat', async (req, res) => {
  const result =  await ytmod.findActiveChat();
  res.redirect(`/?msg=${result}`);
});

app.get('/start-tracking-chat', (req, res) => {
  ytmod.startTrackingChat();
  res.redirect('/?msg=Started Tracking chat');
});

app.get('/stop-tracking-chat', (req, res) => {
  ytmod.stopTrackingChat();
  res.redirect('/?msg=Stopped Tracking chat');
});

app.get('/insert-message', (req, res) => {
  ytmod.insertMessage('Hello Everyone');
  res.redirect('/');
});

app.listen(3000, function() {
  console.log('app is Ready');
});