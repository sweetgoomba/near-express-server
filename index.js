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
    res.sendStatus(200)
})

app.get("/deposit", (req, res) => {
    console.log('deposit deposit');
    res.send('deposit deposit')
})

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 텔레그램
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// npm 모듈 호출
const TelegramBot = require('node-telegram-bot-api');

// `botFather`가 제공한 `token`으로 API 통신에 사용한다
const TELEGRAM_TOKEN= process.env.TELEGRAM_TOKEN; 

// 새로운 'bot' 인스턴스를 생성해 'polling'으로 업데이트를 fetch 하게 한다
const telebot = new TelegramBot(TELEGRAM_TOKEN, {polling: false});

const url = 'https://loveplant.shop';

// 정규식으로 '/echo'를 판별하고 그 뒤에 어떤 메시지든 'msg'에 담는다
telebot.onText(/\/echo (.+)/, (msg, match) => {   
    const chatId = msg.chat.id;
    const res = "꺄악: "+match[1]; 
    // 식별된 "msg"는 보내온 채팅방('chatId')에게 앵무새처럼 재전송한다 ("꺄악: 'msg'")
    telebot.sendMessage(chatId, res);
});

// telebot.on('deposit', query => {
//     console.log('deposit query:', query);
// })

// telebot.on('withdrawal', query => {
//     console.log('withdrawal query:', query);
// })

telebot.on('message', (msg) => {
    console.log('msg:', msg);
    const chatId = msg.chat.id;
    const chatText = msg.text;

    switch (chatText) {
        case 'menu':
        case 'Menu':
        case '메뉴':
            const menuOption = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: '🔆 예치하기',
                                callback_data: 'deposit'
                            },
                            {
                                text: '🔷 출금하기',
                                callback_data: 'withdrawal'
                            }
                        ],
                        [
                            {
                                text: '💵 환전하기',
                                callback_data: 'exchange'
                            },
                            {
                                text: '💰 내 월렛',
                                callback_data: 'wallet'
                            }
                        ]
                    ]
                }
            }

            telebot.sendMessage(msg.chat.id, "메뉴입니다.\n\n어쩌고 저쩌고 블라블라입니다람쥐", menuOption)
            .then((value) => {
                console.log('bot.sendMessage() then()');
                if (telebot.isPolling()) {
                    console.log('isPolling true');
                    telebot.stopPolling().then(() => {
                        telebot.openWebHook();
                    });
                } else {
                    console.log('isPolling false');
                    telebot.openWebHook();
                }
            })
            .catch((error) => {
                console.log("bot.sendMessage() catch() error.code:", error.code);  // => 'ETELEGRAM'
                console.log(error.response.body); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
            });
            
            break;

        default:
            // send a message to the chat acknowledging receipt of their message
            telebot.sendMessage(chatId, '잘 모르겠어요.')
            .then((value) => {
                console.log('bot.sendMessage() then()');
                if (telebot.isPolling()) {
                    console.log('isPolling true');

                    // telebot.stopPolling()
                    // .then(() => {
                    //     console.log('stopped Polling');
                    //     telebot.openWebHook();
                    // })
                    // .catch((error) => {
                    //     console.log("stopPolling() catch() error.code:", error.code); 
                    //     console.log(error.response.body); 
                    // });

                } else {
                    console.log('isPolling false');
                    telebot.openWebHook();
                }
            })
            .catch((error) => {
                console.log("bot.sendMessage() catch() error.code:", error.code);  // => 'ETELEGRAM'
                console.log(error.response.body); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
            });
    } 
});

telebot.setWebHook(`${url}/bot${TELEGRAM_TOKEN}`);

if (telebot.hasOpenWebHook()) {
    console.log('webhook open.');
    // telebot.closeWebHook();
} else {
    console.log('webhook closed.');
    // telebot.openWebHook(); // Error: EFATAL: WebHook and Polling are mutually exclusive
}

// We are receiving updates at the route below!
app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {

    if (telebot.hasOpenWebHook()) {
        // telebot.closeWebHook();
        console.log('webhook open.');
    } else {
        console.log('webhook closed.');
        if (telebot.isPolling()) {
            console.log('isPolling true');
            telebot.stopPolling().then(() => {
                telebot.openWebHook();
            });
        } else {
            console.log('isPolling false');
            telebot.openWebHook();
        }
        
    }

    console.log('telegram app.post("/bot/token")');
    console.log('req.body:', req.body);
            // body: {
            //     update_id: 75325093,
            //     callback_query: {
            //       id: '8429873056235978936',
            //       from: [Object],
            //       message: [Object],
            //       chat_instance: '3570761467547817066',
            //       data: 'deposit'
            //     }
            // },

    switch (req.body.callback_query.data) {
        case 'deposit':
            console.log('예치하기 클릭');
            telebot.sendMessage(req.body.callback_query.from.id, '예치하기를 클릭하셨군요!')
            .then((value) => {
                console.log('bot.sendMessage() then() value:', value);
                telebot.closeWebHook();
            })
            .catch((error) => {
                console.log("bot.sendMessage() catch() error.code:", error.code); 
                console.log(error.response.body); 
            });

            break;

        case 'withdrawal':
            console.log('출금하기 클릭');
            telebot.sendMessage(req.body.callback_query.from.id, '출금하기를 클릭하셨군요!')
            .then((value) => {
                console.log('bot.sendMessage() then() value:', value);
                telebot.closeWebHook();
            })
            .catch((error) => {
                console.log("bot.sendMessage() catch() error.code:", error.code); 
                console.log(error.response.body); 
            });

            break;

        case 'wallet':
            console.log('내 월렛 클릭');
            telebot.sendMessage(req.body.callback_query.from.id, '내 월렛을 클릭하셨군요!')
            .then((value) => {
                console.log('bot.sendMessage() then() value:', value);
                telebot.closeWebHook();
            })
            .catch((error) => {
                console.log("bot.sendMessage() catch() error.code:", error.code); 
                console.log(error.response.body); 
            });

            break;
            
        case 'exchange':
            console.log('환전하기 클릭');
            telebot.sendMessage(req.body.callback_query.from.id, '환전하기를 클릭하셨군요!')
            .then((value) => {
                console.log('bot.sendMessage() then() value:', value);
                telebot.closeWebHook();
            })
            .catch((error) => {
                console.log("bot.sendMessage() catch() error.code:", error.code); 
                console.log(error.response.body); 
            });

            break;
    }

    telebot.processUpdate(req.body);
    res.sendStatus(200);
});

telebot.on('polling_error', (error) => {
    console.log("polling_error:", error.code);  // => 'EFATAL'
});

telebot.on('webhook_error', (error) => {
    console.log("webhook_error:", error.code);  // => 'EPARSE'
});

// telegram
app.post("/telebot22", function(req, res) {
    console.log('telebot!!');
    res.send("HTTP POST request sent to the webhook URL! (telegram)");
})




////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 라인
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



// line
app.post("/webhook", function(req, res) {
    res.send("HTTP POST request sent to the webhook URL! (line)");
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

        let dataString;

        if (message.text == "예치하기") {
            dataString = depositData;
        } else if (message.text == "출금하기") {
            dataString = withdrawalData;
        } else if (message.text == "메뉴" || message.text == "뒤로가기") {
            dataString = menuData;
        } else if (message.text == "환전하기") {
            dataString = exchangeData;
        } else {
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