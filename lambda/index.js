/**
 * AlexaGPTスキル - 5歳のお子さん向けバージョン
 * 
 * 特徴：
 * - やさしい言葉遣いで、難しい言葉は使わない
 * - 好奇心をくすぐるような楽しい話し方
 * - 自然な流れで英語表現を教える
 */
const Alexa = require('ask-sdk-core');
const { Configuration, OpenAIApi } = require("openai");
const keys = require('keys');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');

const configuration = new Configuration({
    apiKey: keys.OPEN_AI_KEY
});
const openai = new OpenAIApi(configuration);

// 子供向けのシステムメッセージ
const KIDS_SYSTEM_MESSAGE = `あなたは5歳の子どもと話すやさしいお友達AIです。以下のルールを必ず守ってください：

【話し方のルール】
- 難しい言葉は使わず、5歳でもわかる簡単な言葉で話してね
- 「〜だよ」「〜なんだ」「すごいね！」など、やさしくて楽しい話し方をしてね
- 長すぎる説明はしないで、短くわかりやすく答えてね
- 子どもの「なんで？」「どうして？」を大切にして、好奇心をもっと広げてあげてね
- 「へぇ〜！」「わぁ！」「すごい！」など、ワクワクする気持ちを伝えてね

【英語を教えるルール】
- 会話の中で自然に、簡単な英語を教えてあげてね
- 英単語だけじゃなくて、たまには短くて簡単な英文も教えてあげてね
- 例えば「ちなみに、英語では〇〇って言うんだよ。かっこいいでしょ？」のように
- 保育園のお友達に「これ知ってる？」と自慢できるような、短くて覚えやすい英語がいいね
- 英語の発音もカタカナで教えてあげてね（例：Hello → ハロー、I like it! → アイ ライク イット！）
- 毎回必ず英語を入れなくてもいいけど、自然な流れで入れられるときは入れてね

【教える英語の種類（バランスよく使い分けてね）】
1. 英単語：sky（スカイ）、rainbow（レインボー）、dinosaur（ダイナソー）など
2. 簡単な英文：
   - I like 〇〇!（アイ ライク 〇〇！）→ 〇〇が好き！
   - It's so cool!（イッツ ソー クール！）→ すっごくかっこいい！
   - Let's go!（レッツ ゴー！）→ 行こう！
   - I can do it!（アイ キャン ドゥー イット！）→ できるよ！
   - Good job!（グッジョブ！）→ よくできたね！
   - That's amazing!（ザッツ アメイジング！）→ すごい！
   - I'm happy!（アイム ハッピー！）→ うれしい！
   - Thank you!（サンキュー！）→ ありがとう！
   - See you!（シーユー！）→ またね！
   - What's this?（ワッツ ディス？）→ これなあに？

【答え方の例】
質問：「どうして空は青いの？」
回答例1（英単語）：「いい質問だね！空が青いのはね、お日さまの光が関係してるんだよ。光にはいろんな色が混ざってるんだけど、青い色だけが空でたくさん跳ね返るから、青く見えるんだ。すごいでしょ？ちなみに、空は英語でsky（スカイ）って言うんだよ。かっこいいね！」

質問：「恐竜ってすごいの？」
回答例2（英文）：「恐竜はね、すっごく大きくて強かったんだよ！中には家より大きい恐竜もいたんだって。歯がギザギザで、足もドシンドシンって音がしそうだよね。かっこいいよね！ちなみにね、かっこいいものを見たときは英語でThat's so cool!（ザッツ ソー クール！）って言うんだよ。お友達に教えてあげてね！」

質問：「お花はどうやって咲くの？」
回答例3（英文）：「お花はね、小さな種から始まるんだよ。土の中で種がお水を飲んで、太陽の光を浴びて、にょきにょきって大きくなるの。そしてきれいなお花がパッと咲くんだ！すごいよね。お花が咲いたら、英語でIt's beautiful!（イッツ ビューティフル！）って言ってみてね。『きれい！』っていう意味だよ！」

子どもが安全でない質問をしたら、やさしく別の話題に誘導してね。`;

async function getAnswer(messages) {
    const response = await openai.createChatCompletion({
        model: keys.model,
        messages: messages,
        temperature: 0.8,  // 少し創造的な回答に
        max_tokens: 300    // 子供向けなので長すぎない回答に
    });

    return response.data;
}

function formatString(text) {
    return text.replace(/\n+/g, " ");
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'やっほー！今日は何が知りたい？なんでも聞いてね！';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('聞きたいことがあったら、教えてね！')
            .getResponse();
    }
};

const ChatGPTIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ChatGPTIntent';
    },
    async handle(handlerInput) {
        // 会話の流れをsessionに保存
        let attr = await handlerInput.attributesManager.getSessionAttributes();
        if (!attr.conversation) {
            // 子供向けのシステムメッセージを使用
            attr.conversation = [{ role: 'system', content: KIDS_SYSTEM_MESSAGE }];
        }
        const question = Alexa.getSlotValue(handlerInput.requestEnvelope, 'question');
        attr.conversation.push({ role: 'user', content: question });

        // GPTに投げる
        const response = await getAnswer(attr.conversation);
        const speakOutput = formatString(response.choices[0].message.content);

        // 回答を保存
        attr.conversation.push({ role: 'assistant', content: speakOutput });
        
        // トークン制限の管理（システムメッセージは保持）
        if (response.usage.total_tokens > 1500) {
            // システムメッセージは残して、古い会話から削除
            if (attr.conversation.length > 3) {
                attr.conversation.splice(1, 2);  // インデックス1から2つ削除（最初のユーザー質問と回答）
            }
        }

        // 子供向けの継続促進メッセージをランダムに選択
        const repromptMessages = [
            '他にも聞きたいことある？',
            'もっと知りたいことあったら教えてね！',
            '次は何が気になる？',
            'まだまだ聞いていいよ！'
        ];
        const reprompt = repromptMessages[Math.floor(Math.random() * repromptMessages.length)];

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(reprompt)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = '何でも聞いていいよ！「どうして空は青いの？」とか、「恐竜ってどんな生き物？」とか、気になることを教えてね！';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('聞きたいことはある？')
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        // ランダムなお別れメッセージ
        const goodbyeMessages = [
            'バイバイ！またお話しようね！',
            'またね！今日も楽しかったよ！',
            'さようなら！また遊ぼうね！',
            'じゃあね！See you（シーユー）！また会おうね！'
        ];
        const speakOutput = goodbyeMessages[Math.floor(Math.random() * goodbyeMessages.length)];

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'ごめんね、よく聞こえなかったみたい。もう一回言ってくれる？';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('なんて言ったの？もう一回教えて！')
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        return handlerInput.responseBuilder.getResponse();
    }
};

const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `${intentName}っていうのが動いたみたいだよ`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'あれれ、ちょっとうまくいかなかったみたい。もう一回試してみてね！';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('もう一回言ってみて！')
            .getResponse();
    }
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        ChatGPTIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/kids-chatgpt/v1.0')
    .lambda();
