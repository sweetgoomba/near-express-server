import { startMsg, menuMsg } from './message.js'
import TelegramBot from 'node-telegram-bot-api';
import https from 'https';
import fs from 'fs';
import { constants } from 'os';
import dotenv from "dotenv";
import express from 'express';

// https://realizetoday.tistory.com/46
// const express = require('express');
const app = express();
// const https = require('https');
// const fs = require('fs');
// const { constants } = require('os');
dotenv.config();
// require('dotenv').config();
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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 텔레그램
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// npm 모듈 호출
// const TelegramBot = require('node-telegram-bot-api');

// `botFather`가 제공한 `token`으로 API 통신에 사용한다
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN; 

// 새로운 'bot' 인스턴스를 생성해 'polling'으로 업데이트를 fetch 하게 한다
const telebot = new TelegramBot(TELEGRAM_TOKEN, {polling: true});

const url = 'https://loveplant.shop';

// 정규식으로 '/echo'를 판별하고 그 뒤에 어떤 메시지든 'msg'에 담는다
telebot.onText(/\/start/, (msg, match) => {   
    const chatId = msg.chat.id;
    const startOption = startMsg.option;

    telebot.sendMessage(msg.chat.id, startMsg.text, startOption)
    .catch((error) => {
        console.log("onText /start error.code:", error.code); 
        console.log(error.response.body); 
    });
});

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
            .catch((error) => {
                console.log("bot.sendMessage() catch() error.code:", error.code);  // => 'ETELEGRAM'
                console.log(error.response.body); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
            });
            
            break;

        // default:
        //     // send a message to the chat acknowledging receipt of their message
        //     telebot.sendMessage(chatId, '잘 모르겠어요.')
        //     .catch((error) => {
        //         console.log("bot.sendMessage() catch() error.code:", error.code);  // => 'ETELEGRAM'
        //         console.log(error.response.body); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }`
        //     });
    } 
});

// 잘가라 webhook 함께해서 더러웠고 다시는 보지 말자
// telebot.setWebHook(`${url}/bot${TELEGRAM_TOKEN}`);

// Handle callback queries (polling 사용)
telebot.on('callback_query', (query) => {
    // Extract relevant information from the callback query
    const { message, data } = query;
    const chatId = message.chat.id;

    console.log('query:', query);
    console.log('message:', message);
    console.log('data:', data);

    switch (data) {
        case 'create_account':
            createAccount(chatId);
            break;

        case 'confirm_account_name_true':
            console.log('confirm_account_name_true');
            break;

        case 'confirm_account_name_false':
            console.log('confirm_account_name_false');
            break;

        default:
            //
    }
});

function createAccount(chatId) {
    console.log('create account');

    // 여기서 계정 생성 하고 돌아오기

    const success = true;

    // 성공 시
    if (success) {
        const option = menuMsg.option;

        // const id = 'kakaoId.test';
        const balance = 200;
        const sender = 'near.test';
        const text = `계정이 성공적으로 생성되었어요.\n\n잔액 : ${balance}\n송금자 : ${sender}`;
        // const text = `계정이 성공적으로 생성되었어요.\n\n계정명 : ${id}\n잔액 : ${balance}\n송금자 : ${sender}`;

        telebot.sendMessage(chatId, text, option)
        .catch((error) => {
            console.log("createAccount sendMessage() catch() error.code:", error.code);
            console.log(error.response.body); 
        });

    // 실패 시
    } else {
        createAccountFail(chatId);
    }
}

// 계정명 입력받는 기획 취소
async function createAccountFail(chatId) {
    console.log('createAccountFail()');
    console.log('chatId:', chatId);

    let listenerReply;

    let contentMessage = await telebot.sendMessage(chatId, "원하시는 계정명을 입력하세요.", {
        "reply_markup": {
            "force_reply": true
        }
    });

    listenerReply = (async (replyHandler) => {
        telebot.removeReplyListener(listenerReply);

        const option = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '네',
                            callback_data: 'confirm_account_name_true'
                        },
                        {
                            text: '아니오',
                            callback_data: 'confirm_account_name_false'
                        }
                    ]
                ],
                force_reply: false
            }
        }

        await telebot.sendMessage(
            replyHandler.chat.id, 
            `입력하신 계정명은 '${replyHandler.text}'이에요.\n계속 진행하시겠어요?`, 
            option
        );

    });

    telebot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);

}

telebot.on('polling_error', (error) => {
    console.log("polling_error:", error.code);  // => 'EFATAL'
    console.log('error:', error);
});

telebot.on('webhook_error', (error) => {
    console.log("webhook_error:", error.code);  // => 'EPARSE'
});


// Create an HTTPS service identical to the HTTP service.
https.createServer(ssl_options, app).listen(443, () => console.log('Server Up and running at 443'));