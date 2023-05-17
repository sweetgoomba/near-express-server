// /start 하면 보내는 웰컴 메세지
export const startMsg = {
    option: {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '계정 생성',
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
    text: "\n안녕하세요? 당신에게 더 가까운 지갑, 베리니어입니다.\n"
}

// 메뉴 메세지
export const menuMsg = {
    option: {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '송금',
                        callback_data: 'transfer'
                    },
                    {
                        text: '계정 조회',
                        callback_data: 'check_account'
                    }
                ],
                [
                    {
                        text: 'FAQ',
                        callback_data: 'FAQ'
                    },
                    {
                        text: '거래내역 조회',
                        callback_data: 'transaction_history'
                    }
                ]
            ]
        }
    }
}