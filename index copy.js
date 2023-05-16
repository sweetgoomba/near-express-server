// const express = require('express');
// const cors = require('cors');
// const app = express();
// app.use(express.json());
// app.get('/', (req, res) => res.send('linked!'));
// app.listen(8001, () => console.log('Server Up and running at 8001'));



// https://realizetoday.tistory.com/46
const express = require('express');
const app = express();
const https = require('https');
const fs = require('fs');
require('dotenv').config();
const TOKEN = process.env.LINE_ACCESS_TOKEN;
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
    res.sendStatus(200)
})

app.get('/hello', (req, res) => res.send('hello!'));
app.get('/happy', (req, res) => res.send('happy~~!'));

app.post("/webhook", function(req, res) {
    res.send("HTTP POST request sent to the webhook URL!");
    // console.log('req:', req);
    // console.log('res:', res);

    const bitcoin = "0.001";
    const ton = "15";

    var eventObj = req.body.events[0];
    var source = eventObj.source;
    var message = eventObj.message;
    console.log('eventObj:', eventObj);
    console.log('eventObj.type:', eventObj.type);
    console.log('source:', source);
    console.log('message:', message);


    // If the user sends a message to your bot, send a reply message
    if (eventObj.type === "message" && message.text == "예치하기") {
        // Message data, must be stringified
        const dataString = JSON.stringify({
            replyToken: req.body.events[0].replyToken,
            messages: [
                {
                    "type": "text",
                    "text": "Welcome to Near"
                },
                {
                    "type": "template",
                    "altText": "This is a buttons template",
                    "template": {
                        "type": "buttons",
                        // "thumbnailImageUrl": "https://picsum.photos/seed/picsum/400/300",
                        // "imageAspectRatio": "rectangle",
                        // "imageSize": "cover",
                        // "imageBackgroundColor": "#FFFFFF",
                        "title": "💰 내 월렛",
                        "text": `\nBitcoin: ${bitcoin} BTC\n\nToncoin: ${ton} TON`,
                        // "defaultAction": {
                        //     "type": "uri",
                        //     "label": "View detail",
                        //     "uri": "https://loveplant.shop/hello"
                        // },
                        "actions": [
                            // {
                            //     "type": "postback",
                            //     "label": "",
                            //     "data": "action=buy&itemid=123"
                            // },
                            // {
                            //     "type": "postback",
                            //     "label": "2",
                            //     "data": "action=add&itemid=123"
                            // },
                            // {
                            //     "type": "postback",
                            //     "label": "Buy",
                            //     "data": "action=buy&itemid=111",
                            //     "displayText": "Buy",
                            //     "inputOption": "openKeyboard",
                            //     "fillInText": "---\nName: \nPhone: \nBirthday: \n---"
                            // },
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
                            },
                            // {
                            //     "type": "uri",
                            //     "label": "View detail",
                            //     "uri": "https://loveplant.shop/happy"
                            // }
                        ]
                    }
                },
                // {
                //     "type": "template",
                //     "altText": "This is a buttons template",
                //     "template": {
                //         "type": "buttons",
                //         "text": "버튼 텍스트",
                //         "actions": [
                //             {
                //                 "type": "postback",
                //                 "label": "Buy222",
                //                 "data": "action=buy&itemid=123"
                //             },
                //         ]
                //     }
                // }
            ]
        })

        // Request header
        const headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + TOKEN
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

// const server = https.createServer(ssl_options, app).listen(443, () => console.log('Server Up and running at 443'));

// Create an HTTPS service identical to the HTTP service.
https.createServer(ssl_options, app).listen(443, () => console.log('Server Up and running at 443'));



// // https://m.blog.naver.com/PostView.naver?isHttpsRedirect=true&blogId=m950827&logNo=221391084929
// /************************  express 사용  ************************/

// var express = require('express');
// var https = require('https'); //http 모듈 대신 https 모듈을 사용합니다.
// var fs = require('fs');

// var server = express();

// const ssl_options = {
//   ca: fs.readFileSync('/etc/letsencrypt/live/loveplant.shop/fullchain.pem'),
//   key: fs.readFileSync('/etc/letsencrypt/live/loveplant.shop/privkey.pem'),
//   cert: fs.readFileSync('/etc/letsencrypt/live/loveplant.shop/cert.pem')
// };

// /*
// //이 부분에 router등 설정을 해주면 됩니다.
// */

// https.createServer(ssl_options, server, (req, res) => {
//   console.log('필요한 코드 넣기');
// }).listen(443, () => {
//   console.log('서버 포트: 443 ...');
// });






// // https://gamsunghacker.tistory.com/150
// var express = require('express');
// const https = require('https');
// const http = require('http');
// const fs = require('fs');
// var app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// // var createError = require('http-errors');

// // // catch 404 and forward to error handler
// // app.use(function (req, res, next) {
// //     next(createError(404));
// // });

// // // Create an HTTP service.
// // http.createServer(app).listen(3000);


// const ssl_options = {
//   ca: fs.readFileSync('/etc/letsencrypt/live/loveplant.shop/fullchain.pem'),
//   key: fs.readFileSync('/etc/letsencrypt/live/loveplant.shop/privkey.pem'),
//   cert: fs.readFileSync('/etc/letsencrypt/live/loveplant.shop/cert.pem')
// };

// // Create an HTTPS service identical to the HTTP service.
// https.createServer(ssl_options, app).listen(443, () => console.log('Server Up and running at 443'));