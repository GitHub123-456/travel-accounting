const db = require('../config/database');
const ResponseUtil = require('../utils/response');
const https = require('https');

async function callDashScope(model, messages, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model,
      messages,
      temperature: 0.1
    });

    const options = {
      hostname: 'dashscope.aliyuncs.com',
      path: '/compatible-mode/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.error) {
            reject(new Error(result.error.message || 'API调用失败'));
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(new Error('解析API响应失败'));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function parseAIResponse(content) {
  try {
    let jsonStr = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      const braceMatch = content.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        jsonStr = braceMatch[0];
      }
    }

    const parsed = JSON.parse(jsonStr);

    return {
      amount: parsed.amount || 0,
      currency: parsed.currency || 'CNY',
      category: parsed.category || '其他',
      subCategory: parsed.subCategory || '',
      remark: parsed.remark || '',
      location: parsed.location || '',
      type: parsed.type || 'personal',
      payerId: parsed.payerId || null,
      participantIds: parsed.participantIds || [],
      payerName: parsed.payerName || '',
      participantNames: parsed.participantNames || [],
      transactionTime: parsed.transactionTime || new Date().toISOString(),
      aiRawText: content
    };
  } catch (e) {
    console.error('AI响应解析失败:', content);
    throw new Error('AI响应格式异常，请重试');
  }
}

async function parseExpense(req, res) {
  try {
    const { bookId } = req.params;
    const { text, imageBase64 } = req.body;
    const currentUserId = req.userId;

    if (!bookId) {
      return ResponseUtil.error(res, '账本ID不能为空', 400);
    }

    if (!text && !imageBase64) {
      return ResponseUtil.error(res, '请输入账单描述或上传图片', 400);
    }

    const [participants] = await db.query(
      'SELECT id, name, user_id FROM participants WHERE account_book_id = ?',
      [bookId]
    );

    const [books] = await db.query('SELECT user_id FROM account_books WHERE id = ?', [bookId]);
    if (books.length === 0) {
      return ResponseUtil.error(res, '账本不存在', 404);
    }

    const creatorId = books[0].user_id;

    const [currentUserRows] = await db.query('SELECT nickname FROM users WHERE id = ?', [currentUserId]);
    const currentUserNickname = currentUserRows.length > 0 ? currentUserRows[0].nickname : '我';

    const [creatorRows] = await db.query('SELECT nickname FROM users WHERE id = ?', [creatorId]);
    const creatorName = creatorRows.length > 0 ? creatorRows[0].nickname : '我';

    const now = new Date();
    const nowStr = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const todayStr = now.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });

    const memberMapping = participants.map(p => {
      const isCurrentUser = p.user_id === currentUserId;
      return `ID=${p.id}, 姓名=${p.name}${isCurrentUser ? ' (当前用户，即"我")' : ''}`;
    }).join('；');
    const allParticipantIds = participants.map(p => p.id);
    const allParticipantNames = participants.map(p => p.name);
    const memberDesc = allParticipantNames.length > 0
      ? `账本成员（共${allParticipantNames.length}人）：${allParticipantNames.join('、')}（创建者：${creatorName}）`
      : `账本创建者：${creatorName}（暂无其他成员）`;

    let systemPrompt = `你是一个专业的记账助手。你的任务是从用户的描述中提取账单信息，并返回JSON格式的结果。

请严格返回以下JSON格式，不要包含任何额外文字：
{
  "amount": 数字（消费金额，必填）,
  "currency": "币种代码（CNY/JPY/USD/EUR/GBP/THB/KRW，默认CNY）",
  "category": "主分类（餐饮/交通/住宿/购物/门票/其他，必填）",
  "subCategory": "子分类（如午餐、打车、酒店等，可选）",
  "remark": "备注说明（可选）",
  "location": "地点（可选）",
  "type": "账单类型（personal-个人账单，shared-共同账单，默认personal）",
  "payerId": 付款人ID（数字，仅共同账单时填写，必须是成员列表中的ID）,
  "payerName": "付款人姓名（仅共同账单时填写）",
  "participantIds": [参与人ID列表]（数字数组，仅共同账单时填写）,
  "participantNames": ["参与人姓名列表"]（仅共同账单时填写）,
  "transactionTime": "消费时间（ISO格式，如未提及则使用当前时间）"
}

当前时间上下文：
- 现在时间：${nowStr}（北京时间）
- 今天：${todayStr}
- 昨天：${yesterdayStr}
- 明天：${tomorrowStr}
如果用户提到"今天"，transactionTime使用今天（${todayStr}）的日期；"昨天"用${yesterdayStr}；"明天"用${tomorrowStr}。
如果提到"昨晚"、"昨晚吃饭"等，使用昨天的日期（${yesterdayStr}），时间可以设为晚上（如20:00:00）。
如果提到"上午"、"下午"、"晚上"等，结合日期并设置合理的小时数。

成员列表：
${memberDesc}

成员ID映射（用于payerId和participantIds字段）：
${memberMapping || '无成员'}
所有成员的ID数组：[${allParticipantIds.join(', ')}]
所有成员的姓名字数组：[${allParticipantNames.map(n => `"${n}"`).join(', ')}]

判断规则：
1. 如果用户提到"AA"、"大家分"、"一起"、"共同"、"分摊"、"平分"等关键词，或明确提到多人分摊，type设为shared
2. 如果用户提到"大家"、"所有人"、"全员"、"全部人"等，participantIds应设为所有成员的ID数组：[${allParticipantIds.join(', ')}]
3. 共同账单时，payerId和participantIds必须是成员列表中存在的ID
4. 如果用户提到"XX付的"、"XX垫付"、"XX买单"，payerId设为对应成员的ID，payerName设为对应姓名
5. 如果用户提到"XX付的 大家AA"、"XX请客"，payerId设为XX的ID，participantIds应包含所有成员的ID：[${allParticipantIds.join(', ')}]
6. 如果用户提到"我付的"、"我垫付"、"我请客"、"我买单"等，"我"指的是当前用户"${currentUserNickname}"，payerId设为该用户在成员列表中的ID，payerName设为"${currentUserNickname}"
7. 如果用户只说"我"、"我自己"，指的就是当前用户"${currentUserNickname}"
8. 币种判断：提到"日元/JPY/円"则为JPY，"美元/USD/$"则为USD，"欧元/EUR/€"则为EUR，"英镑/GBP/£"则为GBP，"泰铢/THB"则为THB，"韩元/KRW/₩"则为KRW，否则为CNY
9. 分类判断：餐饮相关（吃饭、午餐、晚餐、咖啡等）→餐饮，交通相关（打车、地铁、机票等）→交通，住宿相关（酒店、民宿等）→住宿，购物相关（买东西、纪念品等）→购物，门票相关（门票、景区等）→门票，其他→其他`;

    let userPrompt = text || '';

    if (imageBase64) {
      systemPrompt = `你是一个专业的记账助手。你的任务是从用户提供的账单/小票图片中识别消费信息，并结合用户的文字描述，返回JSON格式的结果。

请严格返回以下JSON格式，不要包含任何额外文字：
{
  "amount": 数字（消费金额，必填，从图片中识别）,
  "currency": "币种代码（CNY/JPY/USD/EUR/GBP/THB/KRW，默认CNY）",
  "category": "主分类（餐饮/交通/住宿/购物/门票/其他，必填）",
  "subCategory": "子分类（如午餐、打车、酒店等，可选）",
  "remark": "备注说明（可选，可从图片中提取店铺名等信息）",
  "location": "地点（可选）",
  "type": "账单类型（personal-个人账单，shared-共同账单，默认personal）",
  "payerId": 付款人ID（数字，仅共同账单时填写）,
  "payerName": "付款人姓名（仅共同账单时填写）",
  "participantIds": [参与人ID列表]（数字数组，仅共同账单时填写）,
  "participantNames": ["参与人姓名列表"]（仅共同账单时填写）,
  "transactionTime": "消费时间（ISO格式，如图片中有时间则使用，否则使用当前时间）"
}

成员列表：
${memberDesc}

成员ID映射（用于payerId和participantIds字段）：
${memberMapping || '无成员'}
所有成员的ID数组：[${allParticipantIds.join(', ')}]
所有成员的姓名字数组：[${allParticipantNames.map(n => `"${n}"`).join(', ')}]

判断规则：
1. 如果用户的文字描述中提到"AA"、"大家分"、"一起"、"共同"、"分摊"、"平分"等关键词，或明确提到多人分摊，type设为shared
2. 如果文字描述中提到"大家"、"所有人"、"全员"、"全部人"等，participantIds应设为所有成员的ID数组：[${allParticipantIds.join(', ')}]
3. 共同账单时，payerId和participantIds必须是成员列表中存在的ID
4. 如果文字描述中提到"XX付的"、"XX垫付"、"XX买单"，payerId设为对应成员的ID，payerName设为对应姓名
5. 如果文字描述中提到"XX付的 大家AA"、"XX请客"，payerId设为XX的ID，participantIds应包含所有成员的ID：[${allParticipantIds.join(', ')}]
6. 如果文字描述中提到"我付的"、"我垫付"、"我请客"、"我买单"等，"我"指的是当前用户"${currentUserNickname}"，payerId设为该用户在成员列表中的ID，payerName设为"${currentUserNickname}"
7. 如果用户只说"我"、"我自己"，指的就是当前用户"${currentUserNickname}"
8. 币种根据小票上的货币符号判断：日元/JPY/円→JPY，美元/USD/$→USD，欧元/EUR/€→EUR，英镑/GBP/£→GBP，泰铢/THB→THB，韩元/KRW/₩→KRW，否则为CNY
9. 分类根据图片内容判断：餐饮相关→餐饮，交通相关→交通，住宿相关→住宿，购物相关→购物，门票相关→门票，其他→其他
10. 如果用户没有提供文字描述（只有图片），默认为个人账单（type: "personal"）`;

      const messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
            },
            ...(text ? [{ type: 'text', text }] : [])
          ]
        }
      ];

      const result = await callDashScope('qwen-vl-plus', messages, process.env.DASHSCOPE_API_KEY);
      const content = result.choices[0].message.content;
      const parsed = parseAIResponse(content);

      return ResponseUtil.success(res, parsed, '解析成功');
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const result = await callDashScope('qwen-turbo', messages, process.env.DASHSCOPE_API_KEY);
    const content = result.choices[0].message.content;
    const parsed = parseAIResponse(content);

    return ResponseUtil.success(res, parsed, '解析成功');
  } catch (error) {
    console.error('解析账单错误:', error);
    return ResponseUtil.error(res, `解析失败：${error.message}`, 500);
  }
}

module.exports = {
  parseExpense
};
