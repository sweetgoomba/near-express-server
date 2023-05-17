import { startMsg, menuMsg, realMenuMsg } from './message.js'
import TelegramBot from 'node-telegram-bot-api';
import https from 'https';
import fs from 'fs';
import { constants } from 'os';
import dotenv from "dotenv";
import express from 'express';

const app = express();
dotenv.config();
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
                        ]
                    ]
                }
            }

            telebot.sendMessage(msg.chat.id, "메뉴입니다.", menuOption)
            .catch((error) => {
                console.log("bot.sendMessage() catch() error.code:", error.code);
                console.log(error.response.body);
            });
            
            break;

        // default:
    } 
});

// Handle callback queries (polling 사용)
telebot.on('callback_query', (query) => {
    // Extract relevant information from the callback query
    const { message, data } = query;
    const chatId = message.chat.id;

    console.log('query:', query);
    console.log('message:', message);
    console.log('data:', data);

    switch (data) {
        // 
        case 'create_account':
            console.log('create_account');
            createAccount(chatId);
            break;

        // 입력한 계정명 계속 진행하기 예 눌렀을 때
        case 'confirm_account_name_true':
            console.log('confirm_account_name_true');
            break;

        // 입력한 계정명 계속 진행하기 아니오 눌렀을 때
        case 'confirm_account_name_false':
            console.log('confirm_account_name_false');
            break;

        // 송금하기 눌렀을 때
        case 'transfer':
            console.log('transfer');
            transfer(chatId);
            break;
            
        // 송금할 계정 입력 후 맞는지 확인할 때 '아니오'
        case 'confirm_transfer_account_false':
            console.log('confirm_transfer_account_false');
            // 기본화면으로 이동
            defaultMessage(chatId);
            break;

        // 송금 보낼 금액 맞지 않을 때
        case 'confirm_transfer_amount_false':
            console.log('confirm_transfer_amount_false');
            // 기본화면으로 이동
            defaultMessage(chatId);
            break;

        // default:
            //
    }

    // 송금할 계정 입력 후 맞는지 확인할 때 '예' 눌렀을 경우
    if (data.startsWith('confirm_transfer_account_true:')) {
        // Extract the parameter from the callback_data
        const receiverId = data.split(':')[1]; // 사용자가 입력한 수신자 계정명 파라미터로 받아오기
        console.log('confirm_transfer_account_true - parameter(사용자가 입력한 수신자 계정명):', receiverId);

        get_transfer_amount(chatId, receiverId);

    // 송금 보낼 금액 맞을 때
    } else if (data.startsWith('confirm_transfer_amount_true:')) {
        console.log('confirm_transfer_amount_true');
        const parameters = data.split(':');
        const receiverId = parameters[1];
        const transferAmount = parameters[2];

        start_transfer(chatId, receiverId, transferAmount);
    }
});

// 송금 프로세스 시작
function start_transfer(chatId, receiverId, transferAmount) {
    console.log('start_transfer()');
    telebot.sendMessage(chatId, "서버로 요청을 전달했어요.\n열심히 처리 중이니 잠시만 기다려주세요.")
    .then((res) => {
        console.log('start_transfer() sendMessage then()');
        
        // 수신인 계정명 : receiverId
        // 보낼 금액 : transferAmount
        console.log('수신인 계정명:', receiverId);
        console.log('보낼 금액:', transferAmount);

        /* * * * * * * * * * * * * * * * * * * * * * * * *
         * * * * * * 송금하기 트랜잭션 여기서~~ * * * * * * * * *
         * * * * * * * * * * * * * * * * * * * * * * * * */

        const success = true;

        console.log('typeof transferAmount:', typeof transferAmount);
        console.log('typeof transferAmount:', typeof Number(transferAmount));
        const realBalance = 200 - Number(transferAmount);

        const result = {
            sender : 'abc.test',
            balance : realBalance,
            receiver : 'cde.test',
            timestamp : '2023/05/20, 21:40:23',
            tx_num : 'JCpYi887z...',
            fee : 5
        }

        // 송금 트랜잭션 성공 시
        if (success) {
            console.log('송금 트랜잭션 성공.');

            setTimeout(() => {
                telebot.sendMessage(chatId, `처리가 완료되었어요.\n발급된 영수증은 아래와 같아요.\n\n------------------------\n보내는 이 : ${result.sender}\n잔액 : ${result.balance} NEAR\n받는 이 : ${result.receiver}\n거래시점 : ${result.timestamp}\n거래번호 : ${result.tx_num}\n수수료 : ${result.fee} Ggas`)
                .then(() => {
                    const successOption = realMenuMsg.option;
                    const text = '이제 제대로 베리니어를 즐겨 볼까요?';
                
                    telebot.sendMessage(chatId, text, successOption)
                    .catch((error) => {
                        console.log("송금 트랜잭션 성공 sendMessage() catch() error.code:", error.code);
                        console.log(error.response.body); 
                    });
                })
                .catch((error) => {
                    console.log('Error:', error);
                });
            }, 1000);

        // 송금 트랜잭션 실패 시
        } else {
            console.log('송금 트랜잭션이 실패했음.');
            const failOption = menuMsg.option;
            const failText = "송금요청이 실패했습니다.";
            telebot.sendMessage(chatId, failText, failOption);
        }
    })
    .catch((error) => {
        console.log("start_transfer() sendMessage catch() error.code:", error.code);
        console.log(error.response.body);
    });
}

// 송금할 금액이 1~200 사이이고 정수인지 판단하는 메서드
function isInRange(number) {
    // Check if the number is an integer
    if (Number.isInteger(number)) {
      // Check if the number is within the range of 1 to 200
      if (number >= 1 && number <= 200) {
        return true; // Number is in the desired range
      }
    }
    return false; // Number is outside the desired range or not an integer
}

// 송금하기 -> 보낼 금액(Near) 입력받기
async function get_transfer_amount(chatId, receiverId) {
    let listenerReply;

    let contentMessage = await telebot.sendMessage(chatId, "얼마나 보내시겠어요?\n현재는 한 번에 '1~200 NEAR'까지만 보낼 수 있어요.\n\n숫자만 입력해주세요.\n10NEAR를 보내고 싶으시다면,\n숫자 '10'만 입력해주세요.", {
        "reply_markup": {
            "force_reply": true
        }
    });

    listenerReply = (async (replyHandler) => {
        telebot.removeReplyListener(listenerReply);

        const transferAmount = parseInt(replyHandler.text);
        console.log('typeof transferAmount:', typeof transferAmount);
        console.log('transferAmount:', transferAmount);

        const option = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '네',
                            callback_data: `confirm_transfer_amount_true:${receiverId}:${transferAmount}`
                        },
                        {
                            text: '아니오',
                            callback_data: 'confirm_transfer_amount_false'
                        }
                    ]
                ],
                force_reply: false
            }
        }


        if (isInRange(transferAmount)) {
            // 송금할 금액이 1~200 사이이고 정수임

            /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            * * * * * * * * * * 입력한 금액을 잔액과 비교하는 서버 작업 * * * * * * * *
            * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
            const success = true;

            // 유효한 금액을 입력했을 경우
            if (success) {
                await telebot.sendMessage(
                    replyHandler.chat.id, 
                    `${transferAmount} NEAR가 맞으신가요?`, 
                    option
                );

            // 유효하지 않은 금액을 입력했을 경우
            } else {
                const option = menuMsg.option;
                const text = '보유하신 NEAR보다 많은 금액을 입력하셨어요. 다시 시도해주세요.';
            
                telebot.sendMessage(chatId, text, option)
                .catch((error) => {
                    console.log("송금하기 유효하지 않은 금액을 입력했을 경우 sendMessage() catch() error.code:", error.code);
                    console.log(error.response.body); 
                });
            }
            
        } else {
            // 송금할 금액이 1~200 사이가 아니거나 소수임
            const option = menuMsg.option;
            const text = '1~200 사이의 정수만 입력해주세요.';
        
            telebot.sendMessage(chatId, text, option)
            .catch((error) => {
                console.log("송금할 금액이 1~200 사이가 아니거나 소수임 sendMessage() catch() error.code:", error.code);
                console.log(error.response.body); 
            });
        }

    });

    telebot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);
}

// 송금하기 클릭 후 수신인 계정명 입력받는 메서드
async function transfer(chatId) {
    let listenerReply;

    let contentMessage = await telebot.sendMessage(chatId, "수신인의 계정명을 입력하세요.\n\n예를들면, 'glitch'라고 입력해보세요. 송금 성공해도 괜찮아요. 곧바로 저희가 재송금해드릴게요!", {
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
                            callback_data: `confirm_transfer_account_true:${replyHandler.text}`
                        },
                        {
                            text: '아니오',
                            callback_data: 'confirm_transfer_account_false'
                        }
                    ]
                ],
                force_reply: false
            }
        }

        // 계정명에 ':' 넣으면 안돼서 예외처리 함.
        if (replyHandler.text)

        // Output — The character "I" exists in given string.
        if (replyHandler.text.indexOf(":") !== -1) {
            console.log('입력한 계정명에 ":"가 포함됨.');

            const option = menuMsg.option;
            const text = '계정명에는 ":"를 포함하실 수 없습니다. 다시 시도해주세요.';
        
            telebot.sendMessage(chatId, text, option)
            .catch((error) => {
                console.log("입력한 계정명에 ':'가 포함됨. sendMessage() catch() error.code:", error.code);
                console.log(error.response.body); 
            });
        } else {
            console.log('입력한 계정명에 ":"가 포함되지 않음 -> 진행 가능');

            /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            * * * * * * * * * * 계정이 실제로 존재하는지 서버 확인 작업 * * * * * * * *
            * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

            const exist = true;

            // 계정이 있다면
            if (exist) {
                await telebot.sendMessage(
                    replyHandler.chat.id, 
                    `'${replyHandler.text}'가 맞으신가요?`, 
                    option
                );

            // 계정이 없다면
            } else {
                const option = menuMsg.option;
                const text = '죄송하지만, 해당 계정은 존재하지 않아요. 메인으로 돌아갈게요!';
            
                telebot.sendMessage(chatId, text, option)
                .catch((error) => {
                    console.log("송금할 계정 존재하지 않을 때 sendMessage() catch() error.code:", error.code);
                    console.log(error.response.body); 
                });
            }

        }

    });

    telebot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);
}

// 기본 화면 출력 
function defaultMessage(chatId) {
    console.log('defaultMessage()');

    const option = menuMsg.option;
    const text = '기본화면입니다.';

    telebot.sendMessage(chatId, text, option)
    .catch((error) => {
        console.log("defaultMessage sendMessage() catch() error.code:", error.code);
        console.log(error.response.body); 
    });
}

function createAccount(chatId) {
    console.log('create account');

    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    * * * * * * * * * 여기서 계정 생성 관련 작업 하기 (db에 추가) * * * * * * *
    * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

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