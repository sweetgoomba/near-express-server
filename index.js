import { startMsg, menuMsg, realMenuMsg } from './message.js'
import TelegramBot from 'node-telegram-bot-api';
import https from 'https';
import fs from 'fs';
import { constants } from 'os';
import dotenv from "dotenv";
import express from 'express';

//////////////////////// near-api-js 세팅하는 부분
import nearAPI from "near-api-js";
import { actionCreators } from '@near-js/transactions';

const keyStore = new nearAPI.keyStores.InMemoryKeyStore();

const nearConfig = {
    networkId: "testnet",
    nodeUrl: "https://rpc.testnet.near.org",
    walletUrl: "https://wallet.testnet.near.org",
    helperUrl: "https://helper.testnet.near.org",
    explorerUrl: "https://explorer.testnet.near.org",
    keyStore: keyStore,
};

// 개인키로 활용해야 함.
const keyPair = nearAPI.KeyPair.fromString(
    "55qEt4vr5fGcX9ugX92suhjqq72eEKYFshxkEpc1uzoZ572M5EEimrFjfMcggeN1NctsP2HzHf57dtKMCechM7mY"
);
await keyStore.setKey("testnet", "devjiwon.testnet", keyPair);

const near = await nearAPI.connect(nearConfig);
console.log('--------------------------------------');
console.log("near :", near);
console.log('--------------------------------------');
const accountId = "devjiwon.testnet";
const account = await near.account(accountId);
const contractId = "devjiwon.testnet";
const contract = new nearAPI.Contract(account, contractId, {
    viewMethods: ["get_num", "get_account_info", "check_id"], // Specify the contract's view methods
    changeMethods: ["transfer"],
    sender: accountId,
});
///////////////////////////////////////////////

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
// DB 코드
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
import mysql from 'mysql';

const connection = mysql.createPool({
    connectionLimit: 10,
    host: '127.0.0.1',
    user: 'root',
    password: 'FCLrZEkObfsc1AyZ',
    database: 'neardb',
});

// /start 메세지 받으면 계정 생성 or 기본화면 띄우기 결정하기 위한 디비쿼리
function checkUserExists(sns_id) {
    console.log('checkUserExists()');
    console.log('sns_id:', sns_id);

    let is_allocated_sns_id = 0;

    return new Promise((resolve, reject) => {
        //* 겹치는 sns_id를 확인하기 위한 쿼리 시작
        connection.query('SELECT * FROM `everything` WHERE sns_id = ?', [sns_id], (err, results) => {

            if (err) {
                reject(err);
                return;
            }

            is_allocated_sns_id = results.length;

            if (is_allocated_sns_id === 0) {
                console.log('is_allocated_sns_id === 0');

                resolve(false); // not exist

            } else if (is_allocated_sns_id === 1) {
                console.log('is_allocated_sns_id === 1');
                // 겹친다면, 유저에게 너 이미 지갑 있어요를 반환한다
                // console.log("UPDATE results : 유저에게 `너 이미 지갑 있어요`를 반환한다");
                resolve(true);
            }
        });
    ////////////////////////////// 겹치는 sns_id를 확인하기 위한 쿼리 끝
    });
}
  
// 해당 snsId 값을 가진 유저의 account_name 갸져오는 쿼리
function queryAccountName(snsId) {
    console.log('queryAccountName()');
  
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM `everything` WHERE sns_id = ?', [snsId], (err, results) => {
            if (err) {
                reject(err);
                return;
            }
    
            console.log("results : ", results);
            console.log("results.length : ", results.length);
            console.log("results[0]['account_name'] :", results[0]['account_name']);
    
            resolve(results[0]['account_name']);
        });
    });
}

// 아직 등록되지 않은 snsId -> 디비에 유저 계정 생성하는 쿼리
function createAccountQuery(sns_id) {
    console.log('createAccountQuery()');
    console.log('sns_id:', sns_id);

    let is_allocated_sns_id = 0;

    return new Promise((resolve, reject) => {

        // 겹치지 않는다면, is_allocated=0 이면서 id가 가장 낮은 행을 찾는다.
        connection.query('SELECT * FROM `everything` WHERE is_allocated = 0 ORDER BY id ASC LIMIT 1', (err, results) => {
            if (err) {
                reject(err);
                return;
            }

            console.log('createAccountQuery() select ok ');
            console.log('results:', results);

            // id가 가장 낮은 행에 sns_id를 update하고, is_allocated를 1으로 바꾼다
            connection.query('UPDATE `everything` SET sns_id = ?, is_allocated = ? WHERE id=?', [sns_id, 1, results[0]['id']], (err, results) => {
                if (err) {
                    reject(err);
                    return;
                }
                console.log('createAccountQuery() update ok');

                resolve(true);
            });
        });
    });
}



////////////////////////////////////////////////
/////////// 메세지 text 내용 /////////////////////
///////////////////////////////////////////////

const 송금보낼금액질문 = "Please enter the amount to transfer.\nYou can transfer between 1~200 NEAR.\n\nPlease enter numbers only, and it should be whole number as well.\nIf you want to transfer 10 NEAR,\nenter the number '10'.";
// const 송금보낼금액질문 = "얼마나 보내시겠어요?\n현재는 한 번에 '1~200 NEAR'까지만 보낼 수 있어요.\n\n숫자만 입력해주세요.\n10NEAR를 보내고 싶으시다면,\n숫자 '10'만 입력해주세요.";
const transferWaitMsg = "Your transfer request has been sent.\nPlease wait for a moment.";
// const transferWaitMsg = "서버로 요청을 전달했어요.\n열심히 처리 중이니 잠시만 기다려주세요.";
const letsEnjoyVeryNearMsg = "Let's enjoy Very near!";
// const letsEnjoyVeryNearMsg = "이제 제대로 베리니어를 즐겨 볼까요?";



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 텔레그램
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// npm 모듈 호출
// const TelegramBot = require('node-telegram-bot-api');

// `botFather`가 제공한 `token`으로 API 통신에 사용한다
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

// 새로운 'bot' 인스턴스를 생성해 'polling'으로 업데이트를 fetch 하게 한다
const telebot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const url = 'https://loveplant.shop';

// 정규식으로 '/echo'를 판별하고 그 뒤에 어떤 메시지든 'msg'에 담는다
telebot.onText(/\/start/, async (msg, match) => {
    console.log('telebot.onText(/\/start/....');
    const chatId = msg.chat.id;

    /////////////////////////////////////////////////////////////////////////////////////////////
    ///                  여기서 [백엔드] 해당 사용자의 id가 이미 디비에 할당되어 있는지 확인 
    /////////////////////////////////////////////////////////////////////////////////////////////
    const exist = await checkUserExists(chatId);

    // const exist = false;

    if (exist) {
        console.log('user exists');
        // 계정 이미 존재 - 이미 가입한 사람이기 때문에 곧바로 기본화면(버튼6개) 띄움
        telebot.sendMessage(msg.chat.id, startMsg.text, realMenuMsg.option)
        .catch((error) => {
            console.log("onText /start error.code:", error.code);
            console.log(error.response.body);
        });
    } else {
        // 아직 가입하지 않은 사용자 - 인사말 및 소개
        console.log('user not exist');
        telebot.sendMessage(chatId, startMsg.text, startMsg.option)
        .catch((error) => {
            console.log("onText /start error.code:", error.code);
            console.log(error.response.body);
        });
    }
});

// Handle callback queries (polling 사용)
telebot.on('callback_query', async (query) => {
    // Extract relevant information from the callback query
    const { message, data } = query;
    const chatId = message.chat.id;
    const messageId = message.message_id;

    console.log('query:', query);
    console.log('message:', message);
    console.log('data:', data);

    switch (data) {
        // 계정 생성 클릭
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

        // 계정 조회 
        case 'check_account':
            console.log('check_account');
            check_account(chatId);
            break;

        // 거래내역 조회
        case 'transaction_history':
            console.log('transaction_history');
            transaction_history(chatId);
            break;

        // 블록 검색기 클릭
        case 'search_block':
            console.log('search_block');
            const searchBlockOption = realMenuMsg.option;
            const searchBlockText = `블록 검색기에서 식별되는 abc님의 이름은\n'nice-glitch.test'이에요.\n\n아래 링크를 클릭하셔서 블록 검색기로 이동 후 'abc.glitch.test’를 입력해주세요.\n\n이해해주셔서 고마워요!\n\nhttps://testnet.mynearwallet.com/`;

            telebot.sendMessage(chatId, searchBlockText, searchBlockOption)
                .catch((error) => {
                    console.log("search_block sendMessage() catch() error.code:", error.code);
                    console.log(error.response.body);
                });
            break;
            
        // minigame click
        case 'minigame':
            console.log('minigame');
            const minigameOption = realMenuMsg.option;

            console.log('chatId:', chatId);

            const userAccountName = await queryAccountName('a123456'); // 일단 하드코딩
            console.log('userAccountName:', userAccountName);

            const minigameText = `Let's play mini game!\n\nhttps://loveplant.shop:7777?id=${chatId}`;
            // const minigameText = `Let's play mini game!\n\nhttps://loveplant.shop:7777/id=${userAccountName}`;

            telebot.sendMessage(chatId, minigameText, minigameOption)
                .catch((error) => {
                    console.log("minigame sendMessage() catch() error.code:", error.code);
                    console.log(error.response.body);
                });
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

        // 거래내역 전체보기 버튼 클릭
    } else if (data.startsWith('see_history_all구분자')) {
        // Extract the parameter from the callback_data
        console.log('see_history_all');
        const fullHistory = data.split('구분자')[1]; // 거래내역 전체보기로 보여줄 데이터
        console.log('confirm_transfer_account_true fullHistory:', fullHistory);

        telebot.editMessageText(fullHistory, { chat_id: chatId, message_id: messageId });
    }
});


// Function to ellipsize the text based on the maximum number of lines
function ellipsizeText(text, maxLines) {
    const lines = text.split('\n');

    let shortenedText = '';
    let lineCount = 0;

    for (let i = 0; i < lines.length && lineCount < maxLines; i++) {
        shortenedText += lines[i] + '\n';
        lineCount++;
    }

    if (lineCount >= maxLines) {
        shortenedText += '...';
    }

    return shortenedText;
}

// 거래내역 조회 메서드
function transaction_history(chatId) {

    /* * * * * * * * * * * * * * * * * * * * * * * * 
    * * * * * * * * * * 거래내역 조회 * * * * * * * * *
    * * * * * * * * * * * * * * * * * * * * * * * * */

    const success = true;

    const fullHistory = "Transactions are sorted by most recent.\n\n1. 코인 받음 : sE3x920d\n2. 코인 보냄 : wu3CuR36c\n3. 코인 받음 : sE3x920d\n4. 코인 보냄 : wu3CuR36c\n5. 코인 받음 : sE3x920d\n6. 코인 보냄 : wu3CuR36c\n7. 코인 받음 : sE3x920d\n8. 코인 보냄 : wu3CuR36c\n9. 코인 받음 : sE3x920d\n10. 코인 보냄 : wu3CuR36c";

    const option = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: 'View all',
                        callback_data: `see_history_all구분자` // '구분자'는 말그대로 구분하기 위한 용도
                        // callback_data: `see_history_all구분자${fullHistory}` // '구분자'는 말그대로 구분하기 위한 용도 // Limit = 64 bytes
                    }
                ]
            ]
        }
    }

    // 거래내역 조회 성공
    if (success) {
        const option = realMenuMsg.option;
        const text = `${fullHistory}`;
        // const text = `최근 순서로 정렬했어요.\n\n${fullHistory}`;   

        // Define the maximum number of lines to display
        const maxLines = 5;

        // Generate the shortened text with ellipsis
        const shortenedText = ellipsizeText(text, maxLines);

        console.log('text:', text);
        console.log('shortenedText:', shortenedText);

        if (text == shortenedText) { // 길지 않아서 전체보기 버튼 없이. 
            // if (text == '최근 순서로 정렬했어요.\n\n'.concat("", shortenedText)) { // 길지 않아서 전체보기 버튼 없이. 
            console.log('text == shortenedText');
            telebot.sendMessage(chatId, text)
                .catch((error) => {
                    console.log("transaction_history sendMessage() catch() error.code:", error.code);
                    console.log(error.response.body);
                });
        } else { // 길어서 줄여짐  
            console.log('text != shortenedText');
            telebot.sendMessage(chatId, text, option)
                .catch((error) => {
                    console.log("transaction_history sendMessage() catch() error.code:", error.code);
                    console.log(error.response.body);
                });
        }

    } else {
        const failOption = realMenuMsg.option;
        const failText = "Failed to retrieve transaction history.";
        telebot.sendMessage(chatId, failText, failOption);
    }
}



//################################################################
//###############        스마트 컨트랙트 코드      ####################
//################################################################

// 송금 시 수신자 계정명 유효한지 확인하는 메소드 (스컨)
async function callContractCheckId() {
    console.log('callContractCheckId()');
    try {
        //==========================================MetaTransaction (CheckId 메서드 호출하는 부분)==================================================
        // check_id 호출
        const check_result = await contract.check_id({
            account_id: "devjiwon.testnet",
        });
        console.log("callContractCheckId() check_result:", check_result); // 스컨에서 보낸 결과 받는 부분

        // Log [parkjiwon.testnet]: Account ID 'devjiwon.testnet' is valid: true
    
        //==========================================MetaTransaction (CheckId 메서드 호출하는 부분)==================================================

        return JSON.parse(check_result);

    } catch (error) {
        console.error("callContractCheckId() error:", error);
    }
}

async function callContractGetAccountInfo() {
    console.log('callContractGetAccountInfo()');
    try {
        //==========================================MetaTransaction (get_account_info 메서드 호출하는 부분)==================================================
        // get_account_info 호출
        const account_info_result = await contract.get_account_info({
            account_id: "devjiwon.testnet",
        });
        console.log("account_info_result:", account_info_result); // 스컨에서 보낸 결과 받는 부분
        //==========================================MetaTransaction (get_account_info 메서드 호출하는 부분)==================================================

        // Log [parkjiwon.testnet]: Account Info: {"account_id":"devjiwon.testnet","balance":"166062178531243174299999235"}
        // {"account_id":"devjiwon.testnet","balance":"166062178531243174299999235"}


        return account_info_result;

    } catch (error) {
        console.error("callContractGetAccountInfo() error:", error);
    }
}

async function callContractTransferTx() {
    console.log('callContractTransferTx()');
    try {
        //==========================================MetaTransaction (Transfer 메서드 호출하는 부분)==================================================
        // 위임할 Tx를 정의해주는 부분
        const signedResult = await account.signedDelegate({
            actions: [
                nearAPI.transactions.functionCall(
                    // 송금하는 메서드
                    "transfer",
                    {
                        amount: "5", // 보내는 near
                        to: "devjiwon.testnet", // 수신자
                    },
                    300000000000000, // 가스비
                    0 // 보증금
                ),
            ],
            blockHeightTtl: 60, // Ttl(time to live) : 해당 위임하는 거래가 어느 블록까지 유효한지 블록 갯수를 지정해주는 것.
            receiverId: "devjiwon.testnet", // 메타 tx가 수행되었다는 걸 어떻게 보여줘야 할까
        });
    
        console.log("signedResult", signedResult);
        console.log('signedResult.delegateAction.senderId:', signedResult.delegateAction.senderId);
        console.log('signedResult.delegateAction.receiverId:', signedResult.delegateAction.receiverId);
    
        // Relayer Side
        const relayerKeyPair = nearAPI.KeyPair.fromString(
            // 컨트랙트 배포한 사람 계정 개인키
            "G1map2Hp2cnNE9DDqE2fFn463vHNDhZGrf6GinvvJS62JZLoZDPySFXJahxgxwD3MAsWNF9PwxVVc4zqN9D9L8B"
        );
        // keyStore 생성함.
        // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
        // 여기 코드 await 부터 시작해서 그런가??!
        await keyStore.setKey(
            "testnet",
            "relayertestrelayer.testnet",
            relayerKeyPair
        );
        // 대신 수수료 낼 사람
        const signingAccount = await near.account("relayertestrelayer.testnet");
    
        // 대신 수수료 낼 사람이 서명하고 tx 전송한다.?
        const signAndSendTransactionResult = await signingAccount.signAndSendTransaction({
            actions: [actionCreators.signedDelegate(signedResult)],
            receiverId: signedResult.delegateAction.senderId,
        });
    
        // 송금하는 스컨 호출하고 결과 받는 부분
        // console.log(
        //     "signedResult.delegateAction.receiverId:", signedResult.delegateAction.receiverId
        // );
        //==========================================MetaTransaction (Transfer 메서드 호출하는 부분)==================================================

        // console.log('signAndSendTransactionResult:', signAndSendTransactionResult);
        // console.log('signAndSendTransactionResult.transaction_outcome:', signAndSendTransactionResult.transaction_outcome);
        // console.log('signAndSendTransactionResult.transaction_outcome.outcome:', signAndSendTransactionResult.transaction_outcome.outcome);
        console.log('signAndSendTransactionResult.transaction_outcome.outcome.gas_burnt:', signAndSendTransactionResult.transaction_outcome.outcome.gas_burnt);
        console.log('signAndSendTransactionResult.transaction_outcome.block_hash:', signAndSendTransactionResult.transaction_outcome.block_hash);
        // console.log('signAndSendTransactionResult.transaction:', signAndSendTransactionResult.transaction);

        // const returnData = {
        //     senderId : signedResult.delegateAction.senderId,
        //     receiverId : signedResult.delegateAction.receiverId,
        //     gas_burnt : signAndSendTransactionResult.transaction_outcome.outcome.gas_burnt,
        //     block_hash : signAndSendTransactionResult.transaction_outcome.block_hash,
        // }

        // return returnData;


        // return signedResult;
        // return signAndSendTransactionResult;


            // 0|express  | signedResult SignedDelegate {
            // 0|express  |   delegateAction: DelegateAction {
            // 0|express  |     senderId: 'parkjiwon.testnet',
            // 0|express  |     receiverId: 'devjiwon.testnet',
            // 0|express  |     actions: [ [Action] ],
            // 0|express  |     nonce: <BN: 7359173a99ca>,
            // 0|express  |     maxBlockHeight: <BN: 79111e5>,
            // 0|express  |     publicKey: PublicKey { keyType: 0, data: [Uint8Array] }
            // 0|express  |   },
            // 0|express  |   signature: Signature {
            // 0|express  |     keyType: 0,
            // 0|express  |     data: Uint8Array(64) [
            // 0|express  |        69, 111, 166, 194, 190, 123, 156, 146, 243, 185, 142,
            // 0|express  |        70, 179, 125, 106, 232, 169, 169,  31, 140, 243,  53,
            // 0|express  |       147, 244, 146, 169, 210, 186, 168, 180, 115, 109, 188,
            // 0|express  |        44, 231, 130, 152,  72, 121, 102, 244, 191,   8,  77,
            // 0|express  |       178,  56, 156, 190, 233, 184, 149, 214, 188,  58, 251,
            // 0|express  |       132,  48,  46, 138,   3,   1,   3, 226,   3
            // 0|express  |     ]
            // 0|express  |   }
            // 0|express  | }
            // 0|express  | signedResult.delegateAction.receiverId: devjiwon.testnet





        // 0|express  | signAndSendTransactionResult: {
    //     0|express  |   receipts_outcome: [
    //     0|express  |     {
    //     0|express  |       block_hash: '8QxkiEMi9p3Kgj4g6dKDi7Kmzr2vK5bENqoBnjMHi9FL',
    //     0|express  |       id: 'UGfCvYkzU4QqBoXUgwACcAPACR28TWb5VkMuMTYo2eP',
    //     0|express  |       outcome: [Object],
    //     0|express  |       proof: [Array]
    //     0|express  |     },
    //     0|express  |     {
    //     0|express  |       block_hash: 'DKJA9NdYzDiEE94bc8xyk6jPSPSbwjpVcBzZ3Q5BY61G',
    //     0|express  |       id: 'B8vq43PW3QJ45hJtXXi4424jEK6djjxwhfUCTmWtreB6',
    //     0|express  |       outcome: [Object],
    //     0|express  |       proof: [Array]
    //     0|express  |     },
    //     0|express  |     {
    //     0|express  |       block_hash: 'DCLohzMSSbYfZBnPdmzWZLVYvxfjqazjdk1scwDQ1jYe',
    //     0|express  |       id: '42zyyA4QFZ9QyNZtwarvKjwTQop4fAy8CFJ2BhJRsE2i',
    //     0|express  |       outcome: [Object],
    //     0|express  |       proof: [Array]
    //     0|express  |     },
    //     0|express  |     {
    //     0|express  |       block_hash: 'D29rwAR9MHm7Lrkv97Gsm4CKYD6TpqtYxTm6xHy2z5jL',
    //     0|express  |       id: 'AJLZ6FGGi2nbtxiLMyzvxCAtH4FCcwruvSxKUJ8bfue6',
    //     0|express  |       outcome: [Object],
    //     0|express  |       proof: [Array]
    //     0|express  |     },
    //     0|express  |     {
    //     0|express  |       block_hash: 'DCLohzMSSbYfZBnPdmzWZLVYvxfjqazjdk1scwDQ1jYe',
    //     0|express  |       id: '8PwGf3Aw2m97zg1jTz6wV1MPcsQLTFnzuKDzCqNLwNCQ',
    //     0|express  |       outcome: [Object],
    //     0|express  |       proof: [Array]
    //     0|express  |     },
    //     0|express  |     {
    //     0|express  |       block_hash: 'DKJA9NdYzDiEE94bc8xyk6jPSPSbwjpVcBzZ3Q5BY61G',
    //     0|express  |       id: '7XrgxGMyagaccAiRCKPJenuxgVpA8uAm1mGPP66MMSZN',
    //     0|express  |       outcome: [Object],
    //     0|express  |       proof: [Array]
    //     0|express  |     }
    //     0|express  |   ],
    //     0|express  |   status: { SuccessValue: '' },
    //     0|express  |   transaction: {
    //     0|express  |     actions: [ [Object] ],
    //     0|express  |     hash: '82T8QqSiycLwAi4TtdT84BpCFdsGbx6gxyWBNFLYRpgR',
    //     0|express  |     nonce: 126933621000009,
    //     0|express  |     public_key: 'ed25519:23TfmNLNYyVruArNGf6RvfuBmGr29dcxYDcTyZmjkwmd',
    //     0|express  |     receiver_id: 'devjiwon.testnet',
    //     0|express  |     signature: 'ed25519:41KRmU4QsbyHEAz9wiPTw966vUJw5u2fXkhz9kKvSF1Y67TmejtFi5jwdM1ncqWZjBmuR95fkzjbL7LYZHS8hc8v',
    //     0|express  |     signer_id: 'relayertestrelayer.testnet'
    //     0|express  |   },
    //     0|express  |   transaction_outcome: {
    //     0|express  |     block_hash: '9Xx3vFHK7mREX67iFyNuYD7G4ues22e9sRvRDA4TGmst',
    //     0|express  |     id: '82T8QqSiycLwAi4TtdT84BpCFdsGbx6gxyWBNFLYRpgR',
    //     0|express  |     outcome: {
    //     0|express  |       executor_id: 'relayertestrelayer.testnet',
    //     0|express  |       gas_burnt: 2628023852964,
    //     0|express  |       logs: [],
    //     0|express  |       metadata: [Object],
    //     0|express  |       receipt_ids: [Array],
    //     0|express  |       status: [Object],
    //     0|express  |       tokens_burnt: '262802385296400000000'
    //     0|express  |     },
    //     0|express  |     proof: [ [Object], [Object], [Object], [Object], [Object], [Object] ]
    //     0|express  |   }
    //     0|express  | }

    } catch (error) {
        console.error("callContractTransferTx() error:", error);
    }
}
//################################################################
//###############      스마트 컨트랙트 코드 끝     ####################
//################################################################



// 계정 조회 메서드
async function check_account(chatId) {
    console.log('check_account()');

    /* * * * * * * * * * * * * * * * * * * * * * * * * * *
    * * * * * * * * * * 계정 조회 (블록익스) * * * * * * * * *
    * * * * * * * * * * * * * * * * * * * * * * * * * * */
    // callContractCheckId();
    callContractGetAccountInfo();
    // callContractTransferTx();

    const success = true;

    // 계정 조회 성공
    if (success) {

        // const result = {
        //     account_name: 'nice-glitch.testnet',
        //     balance: 200,
        //     created_at: '2023/05/20, 21:40:23',
        //     account_id: 'JCpYi887z...',
        //     total_tx_count: 12
        // }

        const result = await callContractGetAccountInfo();
        const parsedResult = JSON.parse(result);
        console.log('check_account() result: ', result);
        console.log('check_account() result: ', JSON.parse(result));
        console.log('parsedResult.account_id:', parsedResult.account_id);
        console.log('parsedResult.balance:', parsedResult.account_id);
        console.log('parsedResult.height:', parsedResult.account_id);

        const option = realMenuMsg.option;
        const text = `Account name : ${parsedResult.account_id}\nBalance : ${parsedResult.balance} NEAR\nBlock height : ${parsedResult.height}`;
        // const text = `Account name : ${result.account_name}\nBalance : ${result.balance} NEAR\nAccount created at : ${result.created_at}\nAccount id : ${result.account_id}\nTransaction count : ${result.total_tx_count} times`; // 기획 수정

        telebot.sendMessage(chatId, text, option)
            .catch((error) => {
                console.log("defaultMessage sendMessage() catch() error.code:", error.code);
                console.log(error.response.body);
            });

        // 계정 조회 실패
    } else {
        const failOption = realMenuMsg.option;
        const failText = "Failed to retrieve account information.";
        telebot.sendMessage(chatId, failText, failOption);
    }

}

// 송금 프로세스 시작
function start_transfer(chatId, receiverId, transferAmount) {
    console.log('start_transfer()');
    telebot.sendMessage(chatId, transferWaitMsg)
        .then((res) => {
            console.log('start_transfer() sendMessage then()');

            // 수신인 계정명 : receiverId
            // 보낼 금액 : transferAmount
            console.log('수신인 계정명:', receiverId);
            console.log('보낼 금액:', transferAmount);

            /* * * * * * * * * * * * * * * * * * * * * * * * *
             * * * * * * 송금하기 트랜잭션 여기서~~ * * * * * * * * *
             * * * * * * * * * * * * * * * * * * * * * * * * */
            // const transferResult = await callContractTransferTx();
            // const parsedTransferResult = JSON.parse(transferResult);
            // console.log('transferResult:', transferResult);
            // console.log('parsedTransferResult:', parsedTransferResult);

            // callContractTransferTx();

            // const transferTxResult = await callContractTransferTx();
            // console.log('transferTxResult:', transferTxResult);


            // const parsedSignAndSendTransactionResult = JSON.parse(signAndSendTransactionResult);
            // console.log('parsedSignAndSendTransactionResult:', parsedSignAndSendTransactionResult);


            const success = true;

            console.log('typeof transferAmount:', typeof transferAmount);
            console.log('typeof transferAmount:', typeof Number(transferAmount));
            const realBalance = 200 - Number(transferAmount);

            const result = {
                sender: 'abc.test',
                balance: realBalance,
                receiver: 'cde.test',
                timestamp: '2023/05/20, 21:40:23',
                tx_num: 'JCpYi887z...',
                fee: 5
            }

            // 송금 트랜잭션 성공 시
            if (success) {
                console.log('송금 트랜잭션 성공.');

                setTimeout(() => {
                    telebot.sendMessage(chatId, `Transfer transaction is completed.\nThis is the receipt.\n\n------------------------\nSender : ${result.sender}\nBalance : ${result.balance} NEAR\nReceiver : ${result.receiver}\nTimestamp : ${result.timestamp}\nTransaction number : ${result.tx_num}\nFee : ${result.fee} Ggas`)
                    // telebot.sendMessage(chatId, `처리가 완료되었어요.\n발급된 영수증은 아래와 같아요.\n\n------------------------\n보내는 이 : ${result.sender}\n잔액 : ${result.balance} NEAR\n받는 이 : ${result.receiver}\n거래시점 : ${result.timestamp}\n거래번호 : ${result.tx_num}\n수수료 : ${result.fee} Ggas`)
                        .then(() => {
                            const successOption = realMenuMsg.option;
                            const text = letsEnjoyVeryNearMsg;

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
                console.log('Transfer transaction has failed.');
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
        console.log('integer yes');
        // Check if the number is within the range of 1 to 200
        if (number >= 1 && number <= 200) {
            console.log('between 1~200 no');
            return true; // Number is in the desired range
        } else {
            console.log('between 1~200 yes');
        }
    } else {
        console.log('integer no');
    }
    return false; // Number is outside the desired range or not an integer
}

// 송금하기 -> 보낼 금액(Near) 입력받기
async function get_transfer_amount(chatId, receiverId) {
    let listenerReply;

    let contentMessage = await telebot.sendMessage(chatId, 송금보낼금액질문, {
        "reply_markup": {
            "force_reply": true
        }
    });

    listenerReply = (async (replyHandler) => {
        telebot.removeReplyListener(listenerReply);

        const transferAmount = Number(replyHandler.text);
        console.log('typeof transferAmount:', typeof transferAmount);
        console.log('transferAmount:', transferAmount);

        const option = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Yes',
                            callback_data: `confirm_transfer_amount_true:${receiverId}:${transferAmount}`
                        },
                        {
                            text: 'No',
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

            const accountInfoResult = await callContractGetAccountInfo();
            const parsedAccountInfoResult = JSON.parse(accountInfoResult);
            console.log('parsedAccountInfoResult: ', parsedAccountInfoResult);
            const balance = parsedAccountInfoResult.balance;
            console.log('balance (스컨 결과):', balance);

            let isValidAmount;

            console.log('typeof transferAmount:', typeof transferAmount);
            console.log('잔액비교()');
            if (balance > transferAmount) {
                console.log('balance > transferAmount');
                isValidAmount = true;
            } else {
                console.log('balance > transferAmount 가 아님');
                isValidAmount = false;
            }
            
            // const isValidAmount = true;

            // 유효한 금액을 입력했을 경우
            if (isValidAmount) {
                await telebot.sendMessage(
                    replyHandler.chat.id,
                    `Would you like to transfer ${transferAmount} NEAR?`,
                    // `${transferAmount} NEAR가 맞으신가요?`,
                    option
                );

            // 유효하지 않은 금액을 입력했을 경우
            } else {
                const option = menuMsg.option;
                const text = 'You entered an amount greater than the amount of NEAR you have. Please try again.';

                telebot.sendMessage(chatId, text, option)
                    .catch((error) => {
                        console.log("송금하기 유효하지 않은 금액을 입력했을 경우 sendMessage() catch() error.code:", error.code);
                        console.log(error.response.body);
                    });
            }

        } else {
            // 송금할 금액이 1~200 사이가 아니거나 소수임
            const option = menuMsg.option;
            const text = 'Please enter whole numbers between 1~200.';

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

    let contentMessage = await telebot.sendMessage(chatId, "Enter the recipient's account name.\n\nFor example, type 'glitch'.", {
    // let contentMessage = await telebot.sendMessage(chatId, "수신인의 계정명을 입력하세요.\n\n예를들면, 'glitch'라고 입력해보세요. 송금 성공해도 괜찮아요. 곧바로 저희가 재송금해드릴게요!", {
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
                            text: 'Yes',
                            callback_data: `confirm_transfer_account_true:${replyHandler.text}`
                        },
                        {
                            text: 'No',
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
                const text = 'Account name cannot contain \':\'. Please try again.';
                // const text = '계정명에는 ":"를 포함하실 수 없습니다. 다시 시도해주세요.';

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
               const exist = await callContractCheckId();
               console.log('exist:', exist);

                // const exist = true;

                // 계정이 있다면
                if (exist) {
                    await telebot.sendMessage(
                        replyHandler.chat.id,
                        `Would you like to send NEAR to '${replyHandler.text}'?`,
                        option
                    );

                    // 계정이 없다면
                } else {
                    const option = menuMsg.option;
                    const text = 'Sorry, that account name doesn\'t exist. Please check the recipient name. Going back to the main menu.';
                    // const text = '죄송하지만, 해당 계정은 존재하지 않아요. 메인으로 돌아갈게요!';

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

    const option = startMsg.option;
    const text = startMsg.text;

    telebot.sendMessage(chatId, text, option)
        .catch((error) => {
            console.log("defaultMessage sendMessage() catch() error.code:", error.code);
            console.log(error.response.body);
        });
}

/// 8888

async function createAccount(chatId) {
    console.log('create account');

    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    * * * * * * * * * 여기서 계정 생성 관련 작업 하기 (db에 추가) * * * * * * *
    * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    const createAccountsuccess = await createAccountQuery(chatId);

    // const createAccountsuccess = true;

    // 성공 시
    if (createAccountsuccess) {
        const option = realMenuMsg.option;

        // const id = 'kakaoId.test';
        const balance = 200;
        const sender = 'near.test';
        // const text = `계정이 성공적으로 생성되었어요.\n\n잔액 : ${balance}\n송금자 : ${sender}`;
        const text = `Successfully created your account.\n\nBalance : ${balance}\nSender : ${sender}`;

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

    const text = 'An unknown error has occurred. Going back to the main menu.';

    telebot.sendMessage(chatId, text, startMsg.option)
    .catch((error) => {
        console.log("createAccount sendMessage() catch() error.code:", error.code);
        console.log(error.response.body);
    });

    // 예전 기획
    // let listenerReply;

    // let contentMessage = await telebot.sendMessage(chatId, "원하시는 계정명을 입력하세요.", {
    //     "reply_markup": {
    //         "force_reply": true
    //     }
    // });

    // listenerReply = (async (replyHandler) => {
    //     telebot.removeReplyListener(listenerReply);

    //     const option = {
    //         reply_markup: {
    //             inline_keyboard: [
    //                 [
    //                     {
    //                         text: '네',
    //                         callback_data: 'confirm_account_name_true'
    //                     },
    //                     {
    //                         text: '아니오',
    //                         callback_data: 'confirm_account_name_false'
    //                     }
    //                 ]
    //             ],
    //             force_reply: false
    //         }
    //     }

    //     await telebot.sendMessage(
    //         replyHandler.chat.id,
    //         `입력하신 계정명은 '${replyHandler.text}'이에요.\n계속 진행하시겠어요?`,
    //         option
    //     );

    // });

    // telebot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);

}

telebot.on('polling_error', (error) => {
    console.log("polling_error:", error.code);  // => 'EFATAL'
    console.log('error:', error);
});

telebot.on('webhook_error', (error) => {
    console.log("webhook_error:", error.code);  // => 'EPARSE'
});











////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 라인
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const conversationStateMap = new Map();

let dataString;
let receivedTransferAccountName;
let transferAccountNameConfirm;

let receivedTransferAmountData;


app.post("/webhook", function (req, res) {
    // console.log('경로 : post("/webhook")');

    // res.send("HTTP POST request sent to the webhook URL! (line)");
    // console.log('req:', req);
    // console.log('res:', res);

    const bitcoin = "0.001";
    const ton = "15";

    var eventObj = req.body.events[0];
    var source = eventObj.source;
    var message = eventObj.message;
    console.log('=============== 서버가 req 받음 =======================');
    // console.log('req :', req);
    console.log('req.eventObj:', eventObj);
    console.log('............................................');
    console.log('eventObj.replyToken:', eventObj.replyToken);

    // const conversationStateMap = new Map();

    // Check conversation state and expected response
    const conversationState = retrieveConversationState(eventObj.source.userId);

    // Message data, must be stringified

    // 처음 시작 웰컴 메세지
    const welcomeData = JSON.stringify({
        replyToken: req.body.events[0].replyToken,
        messages: [
            {
                "type": "template",
                "altText": "안녕하세요? 당신에게 더 가까운 지갑, 베리니어입니다.",
                "template": {
                    "type": "buttons",
                    "text": "안녕하세요? 당신에게 더 가까운 지갑, 베리니어입니다.",
                    "actions": [
                        {
                            "type": "postback",
                            "label": "계정 생성",
                            "data": "create_account"
                        },
                        {
                            "type": "postback",
                            "label": "FAQ",
                            "data": "FAQ"
                        }
                    ]
                }
            }
        ]
    })

    let askData;
    let askConfirmTransferAmountData;

    function print4Menu(text) {
        const data = JSON.stringify({
            replyToken: req.body.events[0].replyToken,
            messages: [
                {
                    "type": "template",
                    "altText": text,
                    "template": {
                        "type": "buttons",
                        "text": text,
                        "actions": [
                            {
                                "type": "postback",
                                "label": "송금",
                                "data": "transfer"
                            },
                            {
                                "type": "postback",
                                "label": "계정 조회",
                                "data": "check_account"
                            },
                            {
                                "type": "postback",
                                "label": "거래내역 조회",
                                "data": "transaction_history"
                            },
                            {
                                "type": "postback",
                                "label": "FAQ",
                                "data": "FAQ"
                            }
                        ]
                    }
                }
            ]
        })

        return data;
    }

    function print4MenuPush(text, userId) {
        const data = JSON.stringify({
            to: userId,
            messages: [
                {
                    "type": "template",
                    "altText": text,
                    "template": {
                        "type": "buttons",
                        "text": text,
                        "actions": [
                            {
                                "type": "postback",
                                "label": "송금",
                                "data": "transfer"
                            },
                            {
                                "type": "postback",
                                "label": "계정 조회",
                                "data": "check_account"
                            },
                            {
                                "type": "postback",
                                "label": "거래내역 조회",
                                "data": "transaction_history"
                            },
                            {
                                "type": "postback",
                                "label": "FAQ",
                                "data": "FAQ"
                            }
                        ]
                    }
                }
            ]
        })

        return data;
    }

    function print4Menu(text) {
        const data = JSON.stringify({
            replyToken: req.body.events[0].replyToken,
            messages: [
                {
                    "type": "template",
                    "altText": text,
                    "template": {
                        "type": "buttons",
                        "text": text,
                        "actions": [
                            {
                                "type": "postback",
                                "label": "송금",
                                "data": "transfer"
                            },
                            {
                                "type": "postback",
                                "label": "계정 조회",
                                "data": "check_account"
                            },
                            {
                                "type": "postback",
                                "label": "거래내역 조회",
                                "data": "transaction_history"
                            },
                            {
                                "type": "postback",
                                "label": "FAQ",
                                "data": "FAQ"
                            }
                        ]
                    }
                }
            ]
        })

        return data;
    }

    function print6Menu(text) {
        const data = JSON.stringify({
            replyToken: req.body.events[0].replyToken,
            messages: [
                {
                    "type": "template",
                    "altText": text,
                    "template": {
                        "type": "buttons",
                        "text": text,
                        "actions": [
                            {
                                "type": "postback",
                                "label": "송금",
                                "data": "transfer"
                            },
                            {
                                "type": "postback",
                                "label": "계정 조회",
                                "data": "check_account"
                            },
                            {
                                "type": "postback",
                                "label": "블록 검색기",
                                "data": "search_block"
                            },
                            {
                                "type": "postback",
                                "label": "거래내역 조회",
                                "data": "transaction_history"
                            },
                            {
                                "type": "postback",
                                "label": "미니게임",
                                "data": "minigame"
                            },
                            {
                                "type": "postback",
                                "label": "FAQ",
                                "data": "FAQ"
                            }
                        ]
                    }
                }
            ]
        })

        return data;
    }

    const carouselMsg = {
        "type": "flex",
        "altText": "Carousel Message with Buttons",
        "contents": {
            "type": "carousel",
            "contents": [
                {
                    "type": "bubble",
                    "body": {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "text",
                                "text": "Carousel Message with Buttons",
                                "weight": "bold",
                                "size": "xl"
                            },
                            {
                                "type": "text",
                                "text": "Please select an option:",
                                "wrap": true,
                                "margin": "md"
                            }
                        ]
                    },
                    "footer": {
                        "type": "box",
                        "layout": "vertical",
                        "spacing": "sm",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "spacing": "sm",
                                "contents": [
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "postback",
                                            "label": "송금",
                                            "data": "transfer"
                                        },
                                        "color": "#e2e2e2",
                                        "style": "primary"
                                    },
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "postback",
                                            "label": "계정 조회",
                                            "data": "check_account"
                                        },
                                        "color": "#e2e2e2",
                                        "style": "primary"
                                    }
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "spacing": "sm",
                                "contents": [
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "postback",
                                            "label": "블록 검색기",
                                            "data": "search_block"
                                        },
                                        "color": "#e2e2e2",
                                        "style": "primary"
                                    },
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "postback",
                                            "label": "거래내역 조회",
                                            "data": "transaction_history"
                                        },
                                        "color": "#e2e2e2",
                                        "style": "primary"
                                    }
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "spacing": "sm",
                                "contents": [
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "postback",
                                            "label": "미니게임",
                                            "data": "minigame"
                                        },
                                        "color": "#e2e2e2",
                                        "style": "primary"
                                    },
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "postback",
                                            "label": "FAQ",
                                            "data": "FAQ"
                                        },
                                        "color": "#e2e2e2",
                                        "style": "primary"
                                    }
                                ]
                            }
                        ]
                    }
                }
            ]
        }
    }

    const flexMsgNormalStyle = {
        "type": "flex",
        "altText": "Flex Message",
        "contents": {
            "type": "bubble",
            "direction": "ltr",
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": letsEnjoyVeryNearMsg,
                        "size": "md",
                        "weight": "bold"
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "margin": "lg",
                        "spacing": "sm",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "spacing": "sm",
                                "contents": [
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "postback",
                                            "label": "송금",
                                            "data": "transfer"
                                        },
                                        // "color": "#b1b1b1",
                                        "height": "sm",
                                        "style": "secondary"
                                    },
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "postback",
                                            "label": "계정 조회",
                                            "data": "check_account"
                                        },
                                        // "color": "#b1b1b1",
                                        "height": "sm",
                                        "style": "secondary"
                                    }
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "spacing": "sm",
                                "contents": [
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "postback",
                                            "label": "블록 검색기",
                                            "data": "search_block"
                                        },
                                        // "color": "#b1b1b1",
                                        "height": "sm",
                                        "style": "primary"
                                    },
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "postback",
                                            "label": "거래내역 조회",
                                            "data": "transaction_history"
                                        },
                                        // "color": "#b1b1b1",
                                        "height": "sm",
                                        "style": "primary"
                                    }
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "spacing": "sm",
                                "contents": [
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "postback",
                                            "label": "미니게임",
                                            "data": "minigame"
                                        },
                                        // "color": "#b1b1b1",
                                        "height": "sm",
                                        "style": "link"
                                    },
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "postback",
                                            "label": "FAQ",
                                            "data": "FAQ"
                                        },
                                        // "color": "#b1b1b1",
                                        "height": "sm",
                                        "style": "link"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        }
    }


    const flexMsg = {
        "type": "flex",
        "altText": "Flex Message with Buttons",
        "contents": {
            "type": "carousel",
            "contents": [
                {
                    "type": "bubble",
                    "body": {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "text",
                                "text": "Flex Message with Buttons",
                                "weight": "bold",
                                "size": "md"
                            }
                        ]
                    },
                    "footer": {
                        "type": "box",
                        "layout": "vertical",
                        "spacing": "sm",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "spacing": "sm",
                                "contents": [
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "postback",
                                            "label": "Button 1",
                                            "data": "Button 1"
                                        },
                                        "color": "#FF0000",
                                        "style": "primary"
                                    },
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "message",
                                            "label": "Button 2",
                                            "text": "Button 2"
                                        },
                                        "color": "#00FF00",
                                        "style": "primary"
                                    }
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "spacing": "sm",
                                "contents": [
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "message",
                                            "label": "Button 3",
                                            "text": "Button 3"
                                        },
                                        "color": "#0000FF",
                                        "style": "primary"
                                    },
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "message",
                                            "label": "Button 4",
                                            "text": "Button 4"
                                        },
                                        "color": "#FFFF00",
                                        "style": "primary"
                                    }
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "spacing": "sm",
                                "contents": [
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "message",
                                            "label": "Button 5",
                                            "text": "Button 5"
                                        },
                                        "color": "#00FFFF",
                                        "style": "primary"
                                    },
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "message",
                                            "label": "Button 6",
                                            "text": "Button 6"
                                        },
                                        "color": "#FF00FF",
                                        "style": "primary"
                                    }
                                ]
                            }
                        ]
                    }
                }
            ]
        }
    }

    function print6MenuPush(text, userId) {
        const data = JSON.stringify({
            to: userId,
            messages: [flexMsgNormalStyle]
        })

        return data;
    }

    // 송금
    const transferData = JSON.stringify({
        replyToken: req.body.events[0].replyToken,
        messages: [
            {
                "type": "text",
                "text": "수신인의 계정명을 입력하세요. 예를들면, 'glitch'라고 입력해보세요. 송금 성공해도 괜찮아요. 곧바로 저희가 재송금해드릴게요!"
            }
        ]
    })

    // 송금 얼마나 할거니
    const transferAmountData = JSON.stringify({
        replyToken: req.body.events[0].replyToken,
        messages: [
            {
                "type": "text",
                "text": "얼마나 보내시겠어요?\n현재는 한 번에 ‘1~200 NEAR’까지만 보낼 수 있어요.\n\n숫자만 입력해주세요.\n10NEAR를 보내고 싶으시다면,\n숫자 '10'만 입력해주세요."
            }
        ]
    })

    // 송금하기 서버로 요청 전달 기다려줘 메세지
    const transferWaitData = JSON.stringify({
        replyToken: req.body.events[0].replyToken,
        messages: [
            {
                "type": "text",
                "text": transferWaitMsg
            }
        ]
    })

    // 거래내역 조회
    const transactionHistoryData = JSON.stringify({
        replyToken: req.body.events[0].replyToken,
        messages: [
            {
                "type": "text",
                "text": "거래내역 조회"
            }
        ]
    })

    function transferAmountConfirmed(userId) {
        console.log('transferAmountConfirmed()');
        console.log('userId:', userId);

        // Send the first message and then send the second message using promises
        sendWaitTransferMsg(userId)
            .then(() => sendTransferResult(userId))
            .then(() => letsEnjoyVeryNear(userId))
            .catch((error) => console.error("sendWaitTransferMsg() error:", error));

    }

    function letsEnjoyVeryNear(userId) {
        // setTimeout(() => {
        console.log('letsEnjoyVeryNear()');
        console.log('userId:', userId);
        dataString = print6MenuPush(letsEnjoyVeryNearMsg, userId);
        return pushMessage();
        // }, 500);
    }

    function sendWaitTransferMsg(userId) {
        console.log('sendWaitTransferMsg()');
        console.log('userId:', userId);
        console.log('req.body.events[0].replyToken:', req.body.events[0].replyToken);

        dataString = transferWaitData;
        return replyMessage();
    }

    function sendTransferResult(userId) {
        console.log('sendTransferResult()');

        console.log('userId:', userId);

        console.log('수신인 계정명 receivedTransferAccountName:', receivedTransferAccountName);
        console.log('보낼 금액 receivedTransferAmountData:', receivedTransferAmountData);

        /* * * * * * * * * * * * * * * * * * * * * * * * *
         * * * * * * 송금하기 트랜잭션 여기서~~ * * * * * * * * *
         * * * * * * * * * * * * * * * * * * * * * * * * */

        const success = true;

        console.log('typeof receivedTransferAmountData:', typeof receivedTransferAmountData);
        console.log('typeof receivedTransferAmountData:', typeof Number(receivedTransferAmountData));
        const realBalance = 200 - Number(receivedTransferAmountData);

        const result = {
            sender: 'abc.test',
            balance: realBalance,
            receiver: 'cde.test',
            timestamp: '2023/05/20, 21:40:23',
            tx_num: 'JCpYi887z...',
            fee: 5
        }

        // 송금 트랜잭션 성공 시
        if (success) {
            console.log('송금 트랜잭션 성공.');

            // setTimeout(() => {

            // 송금 성공 메세지
            const transferSuccessData = JSON.stringify({
                to: userId,
                messages: [
                    {
                        "type": "text",
                        "text": `처리가 완료되었어요.\n발급된 영수증은 아래와 같아요.\n\n------------------------\n보내는 이 : ${result.sender}\n잔액 : ${result.balance} NEAR\n받는 이 : ${result.receiver}\n거래시점 : ${result.timestamp}\n거래번호 : ${result.tx_num}\n수수료 : ${result.fee} Ggas`
                    }
                ]
            })

            dataString = transferSuccessData;
            return pushMessage(userId);


            // }, 1000);

            // 송금 트랜잭션 실패 시
        } else {
            // setTimeout(() => {

            console.log('송금 트랜잭션이 실패했음.');
            dataString = print4MenuPush('송금요청이 실패했습니다.', userId);
            return pushMessage(userId);

            // }, 1000);
        }

    }

    function transferAccountNameConfirmed(userId) {
        console.log('transferAccountNameConfirmed()');
        console.log('userId:', userId);
        dataString = transferAmountData;
        const expectingReplyType = 'expecting_reply_transfer_amount';
        console.log('expectingReplyType:', expectingReplyType);

        if (conversationStateMap.get(userId) !== expectingReplyType) {
            console.log('conversationStateMap.get(userId) !== ' + expectingReplyType);
            // Start a new conversation or handle the message accordingly
            startNewConversation(userId, expectingReplyType);
        } else {
            console.log('conversationStateMap.get(userId) === ' + expectingReplyType);
        }

    }

    function handleTransfer(userId) {
        console.log('handleTransfer()');
        dataString = transferData;
        const expectingReplyType = 'expecting_reply';

        if (conversationStateMap.get(userId) !== 'expecting_reply') {
            console.log('conversationStateMap.get(userId) !== "expecting_reply"');
            // Start a new conversation or handle the message accordingly
            startNewConversation(userId, expectingReplyType);
        } else {
            console.log('conversationStateMap.get(userId) === "expecting_reply"');
        }
    }

    function startNewConversation(userId, expectingReplyType) {
        console.log('startNewConversation()');
        console.log('expectingReplyType:', expectingReplyType);

        // Store conversation state
        storeConversationState(userId, expectingReplyType);

        replyMessage();
    }

    function processTransferAmount(userId, userMessage) {
        console.log('processTransferAmount()');
        console.log('userMessage:', userMessage);

        receivedTransferAmountData = userMessage;

        ///////////////////////////////////////////////////////////////
        ////////// 여기서 입력 금액이 유효한지, 잔액초과인지 체크
        ///////////////////////////////////////////////////////////////

        askConfirmTransferAmountData = JSON.stringify({
            replyToken: req.body.events[0].replyToken,
            messages: [
                {
                    type: "template",
                    altText: `${receivedTransferAmountData} NEAR가 맞으신가요?`,
                    template: {
                        type: "buttons",
                        text: `${receivedTransferAmountData} NEAR가 맞으신가요?`,
                        actions: [
                            {
                                type: "postback",
                                label: "예",
                                data: "confirm_transfer_amount_true"
                            },
                            {
                                type: "postback",
                                label: "아니오",
                                data: "confirm_transfer_amount_false"
                            }
                        ]
                    }
                }
            ]
        })

        dataString = askConfirmTransferAmountData;

        // Clear conversation state
        clearConversationState(userId);

        replyMessage();

    }

    function processTransferAccountName(userId, userMessage) {
        console.log('processTransferAccountName()');
        console.log('userMessage:', userMessage);

        receivedTransferAccountName = userMessage;
        console.log('receivedTransferAccountName:', receivedTransferAccountName);
        transferAccountNameConfirm = '"' + userMessage + '"' + '가 맞으신가요?';
        console.log('transferAccountNameConfirm:', transferAccountNameConfirm);

        askData = JSON.stringify({
            replyToken: req.body.events[0].replyToken,
            messages: [
                {
                    type: "template",
                    altText: transferAccountNameConfirm,
                    template: {
                        type: "buttons",
                        text: transferAccountNameConfirm,
                        actions: [
                            {
                                type: "postback",
                                label: "예",
                                data: "confirm_account_name_true"
                            },
                            {
                                type: "postback",
                                label: "아니오",
                                data: "confirm_account_name_false"
                            }
                        ]
                    }
                }
            ]
        })

        dataString = askData;

        // Clear conversation state
        clearConversationState(userId);

        replyMessage();
    }

    // Helper functions to store and retrieve conversation state (using a simple in-memory storage for demonstration purposes)

    function storeConversationState(userId, state) {
        console.log('storeConversationState()');
        conversationStateMap.set(userId, state);
        console.log('conversationStateMap.set 완료');
        console.log('conversationStateMap:', conversationStateMap);
        console.log('conversationStateMap.get(userId):', conversationStateMap.get(userId));
        console.log('conversationState:', conversationState);
        console.log('- - - - - - - - - - - - - - - - - - - -');
    }

    function retrieveConversationState(userId) {
        console.log('retrieveConversationState()');
        return conversationStateMap.get(userId);
    }

    function clearConversationState(userId) {
        console.log('clearConversationState()');
        conversationStateMap.delete(userId);
    }

    // type이 message 면 해당 버튼 클릭했을 때 유저가 메세지를 보냄, 반면에 postback은 유저가 메세지 보내는 것 없이 미리 정의한 코드가 실행됨
    if (eventObj.type === "postback") {
        console.log('');
        console.log('eventObj.type === "postback"');
        console.log('eventObj.postback.data:', eventObj.postback.data);

        switch (eventObj.postback.data) {
            // 송금
            case 'transfer':
                console.log('postback: transfer');
                handleTransfer(eventObj.source.userId);
                break;

            // 계정 생성
            case 'create_account':
                console.log('postback: create_account');
                dataString = print4Menu('계정이 성공적으로 생성되었어요.\n잔액 : 200 Near\n송금자 : near.test');
                replyMessage();
                break;

            // 계정 조회
            case 'check_account':
                console.log('postback: check_account');
                // dataString = transferData;
                replyMessage();
                break;

            // 거래내역 조회
            case 'transaction_history':
                console.log('postback: transaction_history');
                replyMessage();
                break;

            // FAQ
            case 'FAQ':
                console.log('postback: FAQ');
                replyMessage();
                break;

            // 송금 보낼 계정명 맞냐는 질문에 예 했을 때
            case 'confirm_account_name_true':
                console.log('confirm_account_name_true');
                transferAccountNameConfirmed(eventObj.source.userId);
                break;

            // 송금보낼 계정명 맞냐는 질문에 아니오 했을 때
            case 'confirm_account_name_false':
                console.log('confirm_account_name_false');
                dataString = print4Menu('기본화면입니다.');
                replyMessage();
                break;

            // 송금보낼 금액 맞냐는 질문에 예 했을 때
            case 'confirm_transfer_amount_true':
                console.log('confirm_transfer_amount_true');
                transferAmountConfirmed(eventObj.source.userId);
                break;

            // 송금보낼 금액 맞냐는 질문에 아니오 했을 때
            case 'confirm_transfer_amount_false':
                console.log('confirm_transfer_amount_false');
                dataString = print4Menu('기본화면입니다.');
                replyMessage();
                break;
        }
    }


    // If the user sends a message to your bot, send a reply message
    if (eventObj.type === "message") {
        console.log('');
        console.log('eventObj.type === "message"');
        console.log('eventObj.message.text:', eventObj.message.text);

        // let dataString;
        switch (message.text) {
            case '/start':
                console.log('message.text == /start');
                dataString = welcomeData;
                replyMessage();
                break;

            default:

                console.log('default');
                console.log('eventObj.source.userId:', eventObj.source.userId);

                // const conversationState = retrieveConversationState(eventObj.source.userId);

                console.log('conversationStateMap:', conversationStateMap);
                console.log('conversationStateMap.get(eventObj.source.userId):', conversationStateMap.get(eventObj.source.userId));

                if (conversationStateMap.get(eventObj.source.userId) === 'expecting_reply') {
                    // 송금하기 - 보낼 계정명 입력받을 때
                    console.log('conversationStateMap.get(eventObj.source.userId) === "expecting_reply" !! ');
                    // Continue the conversation based on the user's response
                    processTransferAccountName(eventObj.source.userId, eventObj.message.text);
                } else if (conversationStateMap.get(eventObj.source.userId) === 'expecting_reply_transfer_amount') {
                    // 송금하기 - 송금할 금액 입력받을 때
                    console.log('conversationStateMap.get(eventObj.source.userId) === "expecting_reply_transfer_amount"');
                    processTransferAmount(eventObj.source.userId, eventObj.message.text);
                }
        }

    }

    function pushMessage() {
        // https://api.line.me/v2/bot/message/push

        console.log('&&&&&&&&&&&& pushMessage() &&&&&&&&&&&&&&');

        console.log('dataString:', dataString);

        // Request header
        const headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + LINE_TOKEN
        }

        // Options to pass into the request
        const webhookOptions = {
            "hostname": "api.line.me",
            "path": "/v2/bot/message/push",
            "method": "POST",
            "headers": headers,
            "body": dataString
        }

        return new Promise((resolve, reject) => {
            const request = https.request(webhookOptions, (res) => {
                let responseBody = '';

                res.on('data', (chunk) => {
                    responseBody += chunk;
                });

                res.on('end', () => {
                    console.log('responseBody:', responseBody);
                    resolve(responseBody);
                });
            });

            request.on('error', (error) => {
                reject(error);
            });

            request.write(dataString);
            request.end();
        });
    }

    function replyMessage() {

        console.log('&&&&&&&&&&&& replyMessage() &&&&&&&&&&&&&&');

        console.log('dataString:', dataString);

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

        return new Promise((resolve, reject) => {
            const request = https.request(webhookOptions, (res) => {
                let responseBody = '';

                res.on('data', (chunk) => {
                    responseBody += chunk;
                });

                res.on('end', () => {
                    console.log('responseBody:', responseBody);
                    resolve(responseBody);
                });
            });

            request.on('error', (error) => {
                reject(error);
            });

            request.write(dataString);
            request.end();
        });

        // // Define request
        // const request = https.request(webhookOptions, (res) => {
        //     res.on("data", (d) => {
        //         process.stdout.write(d)
        //     })
        // })

        // // Handle error
        // request.on("error", (err) => {
        //     console.error(err)
        // })

        // // Send data
        // request.write(dataString)
        // request.end()

    }


})
// */







// Create an HTTPS service identical to the HTTP service.
https.createServer(ssl_options, app).listen(443, () => console.log('Server Up and running at 443'));