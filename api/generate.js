const API_CONFIGS = {
    siliconflow: {
        apiKey: process.env.SILICONFLOW_API_KEY,
        endpoint: 'https://api.siliconflow.cn/v1/chat/completions'
    },
    openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        endpoint: 'https://openrouter.ai/api/v1/chat/completions'
    }
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { provider, model, messages } = req.body;
    const config = API_CONFIGS[provider];

    try {
        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: true
            })
        });

        // 代理转发流式响应
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
        res.end();

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
