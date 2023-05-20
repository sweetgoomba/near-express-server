// /start 하면 보내는 웰컴 메세지
export const startMsg = {
    option: {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: 'create account',
                        // text: '계정 생성',
                        callback_data: 'create_account'
                    },
                    {
                        text: 'FAQ',
                        callback_data: 'FAQ'
                    }
                ]
            ]
        }
    },
    text: "\nHi! This is your nearer wallet, Very Near.\n"
    // text: "\n안녕하세요? 당신에게 더 가까운 지갑, 베리니어입니다.\n"
}

// 메뉴 메세지
export const menuMsg = {
    option: {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: 'transfer',
                        // text: '송금',
                        callback_data: 'transfer'
                    },
                    {
                        text: 'check account',
                        callback_data: 'check_account'
                    }
                ],
                [
                    {
                        text: 'FAQ',
                        callback_data: 'FAQ'
                    },
                    {
                        text: 'transaction history',
                        callback_data: 'transaction_history'
                    }
                ]
            ]
        }
    }
}

// 메뉴 메세지
export const realMenuMsg = {
    option: {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: 'transfer',
                        callback_data: 'transfer'
                    },
                    {
                        text: 'transaction history',
                        callback_data: 'transaction_history'
                    }
                ],
                [
                    {
                        text: 'mini game',
                        callback_data: 'minigame'
                    },
                    {
                        text: 'check account',
                        callback_data: 'check_account'
                    }
                ],
                [
                    {
                        text: 'FAQ',
                        callback_data: 'FAQ'
                    },
                    {
                        text: 'block explorer',
                        callback_data: 'search_block'
                    }
                ]
            ]
        }
    }
}