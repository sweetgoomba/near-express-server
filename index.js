const express = require('express');
const app = express();
const https = require('https');
const fs = require('fs');
const { constants } = require('os');
require('dotenv').config();
const LINE_TOKEN = process.env.LINE_ACCESS_TOKEN;
const ssl_options = {
  ca: fs.readFileSync('/etc/letsencrypt/live/loveplant.shop/fullchain.pem'),
  key: fs.readFileSync('/etc/letsencrypt/live/loveplant.shop/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/loveplant.shop/cert.pem')
};
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}))
// app.get('/', (req, res) => res.send('linked!'));

app.get("/", (req, res) => {
  console.log('');
  console.log('경로 : get("/")');
  console.log('');
  res.sendStatus(200)
})

app.get("/deposit", (req, res) => {
  console.log('');
  console.log('경로 : get("/deposit")');
  console.log('');
  res.send('deposit deposit')
})

// /*
// line
app.post("/webhook", function(req, res) {
  console.log('');
  console.log('경로 : post("/webhook")');
  console.log('');
  res.send("HTTP POST request sent to the webhook URL! (line)");
    // console.log('req:', req);
    // console.log('res:', res);

  const bitcoin = "0.001";
  const ton = "15";

  var eventObj = req.body.events[0];
  var source = eventObj.source;
  var message = eventObj.message;
  console.log('');
  console.log('=============== 서버가 req 받음 =======================');
  // console.log('req :', req);
  console.log('req.eventObj:', eventObj);
  // console.log("req.eventObj.type : ",eventObj.type);
  // console.log("req.eventObj.message : ",eventObj.message);
  // console.log("req.eventObj.webhookEventId : ",eventObj.webhookEventId);
  // console.log("req.eventObj.deliveryContext : ",eventObj.deliveryContext);
  // console.log("req.eventObj.timestamp : ",eventObj.timestamp);
  // console.log("req.eventObj.source : ",eventObj.source);
  // console.log("req.eventObj.replyToken : ",eventObj.replyToken);
  // console.log("req.eventObj.mode : ",eventObj.mode);
  console.log('');

    // Message data, must be stringified
    // 메뉴
  const menuData = JSON.stringify({
    replyToken: req.body.events[0].replyToken,
    messages: [
    {
      "type": "template",
      "altText": "예치하기",
      "template": {
        "type": "buttons",
        "title": "💰 내 월렛",
        "text": `\nBitcoin: ${bitcoin} BTC\n\nToncoin: ${ton} TON`,
        "actions": [
        {
          "type": "message",
          "label": "예치",
          "text": "예치하기"
        },
        {
          "type": "message",
          "label": "출금",
          "text": "출금하기"
        },
        {
          "type": "message",
          "label": "환전",
          "text": "환전하기"
        }
        ]
      }
    }
    ]
  })

    // 예치
  const depositData = JSON.stringify({
    replyToken: req.body.events[0].replyToken,
    messages: [
    {
      "type": "template",
      "altText": "예치하기",
      "template": {
        "type": "buttons",
        "title": "🔆 예치하기",
        "text": "예치하기 메뉴입니다.",
        "actions": [
        {
          "type": "message",
          "label": "예치1",
          "text": "예치하기1"
        },
        {
          "type": "message",
          "label": "예치2",
          "text": "예치하기2"
        },
        {
          "type": "message",
          "label": "뒤로가기",
          "text": "뒤로가기"
        }
        ]
      }
    }
    ]
  })

    // 출금
  const withdrawalData = JSON.stringify({
    replyToken: req.body.events[0].replyToken,
    messages: [
    {
      "type": "template",
      "altText": "출금하기",
      "template": {
        "type": "buttons",
        "title": "🔷 출금하기",
        "text": "출금하기 메뉴입니다.",
        "actions": [
        {
          "type": "message",
          "label": "출금1",
          "text": "출금하기1"
        },
        {
          "type": "message",
          "label": "출금2",
          "text": "출금하기2"
        },
        {
          "type": "message",
          "label": "뒤로가기",
          "text": "뒤로가기"
        }
        ]
      }
    }
    ]
  })

    // 출금
  const exchangeData = JSON.stringify({
    replyToken: req.body.events[0].replyToken,
    messages: [
    {
      "type": "template",
      "altText": "💵 환전하기",
      "template": {
        "type": "confirm",
        "text": "환전하시겠습니까?",
        "actions": [
        {
          "type": "message",
          "label": "예",
          "text": "예"
        },
        {
          "type": "message",
          "label": "아니오",
          "text": "아니오"
        }
        ]
      }
    }
    ]
  })

    // 모름
  const unknownData = JSON.stringify({
    replyToken: req.body.events[0].replyToken,
    messages: [
    {
      "type": "text",
      "text": "잘 모르겠어요"
    }
    ]
  })


    // If the user sends a message to your bot, send a reply message
  if (eventObj.type === "message") {
    console.log('');
    console.log('eventObj.type === "message"');

    let dataString;

    if (message.text == "예치하기") {
      console.log('     message.text == "예치하기") ');
      dataString = depositData;
    } else if (message.text == "출금하기") {
      console.log('     message.text == "출금하기") {');
      dataString = withdrawalData;
    } else if (message.text == "메뉴" || message.text == "뒤로가기") {
      console.log('     message.text == "메뉴" || message.text == "뒤로가기") {');
      dataString = menuData;
    } else if (message.text == "환전하기") {
      console.log('     message.text == "환전하기") {');
      dataString = exchangeData;
    } else {
      console.log('     message.text == unknownData');
      dataString = unknownData;
    }

        // Request header
    const headers = {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + LINE_TOKEN
    }

        // Options to pass into the request
    const webhookOptions = {
      "hostname": "api.line.me",
      "path": "/v2/bot/message/reply",
      "method": "POST",
      "headers": headers,
      "body": dataString
    }

        // Define request
    const request = https.request(webhookOptions, (res) => {
      res.on("data", (d) => {
        process.stdout.write(d)
      })
    })

        // Handle error
    request.on("error", (err) => {
      console.error(err)
    })

        // Send data
    request.write(dataString)
    request.end()

  } 
})
// */

https.createServer(ssl_options, app).listen(443, () => console.log('Server Up and running at 443 '));

