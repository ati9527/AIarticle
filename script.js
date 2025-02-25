document.addEventListener('DOMContentLoaded', function() {
    // 添加配置检查
    if (!window.API_CONFIGS) {
        console.error('API配置未加载');
        alert('配置文件加载失败，请检查网络连接或刷新页面重试');
        return;
    }

    const topicSelect = document.getElementById('topic');
    const customTopicInput = document.getElementById('customTopic');

    // 监听主题选择变化
    topicSelect.addEventListener('change', function() {
        customTopicInput.style.display = this.value === 'custom' ? 'block' : 'none';
    });

    let currentController = null;

    async function makeApiRequest(promptContent) {
        try {
            const modelSelect = document.getElementById('modelSelect');
            const selectedOption = modelSelect.options[modelSelect.selectedIndex];
            const apiProvider = selectedOption.dataset.provider;
            const model = modelSelect.value;
            
            // 检查配置是否存在
            if (!window.API_CONFIGS || !window.API_CONFIGS[apiProvider]) {
                throw new Error('API 配置错误，请检查 config.js 是否正确加载');
            }

            const config = window.API_CONFIGS[apiProvider];

            const outputText = document.getElementById('outputText');
            const loading = document.getElementById('loading');

            // 取消之前的请求
            if (currentController) {
                currentController.abort();
            }

            currentController = new AbortController();
            loading.style.display = 'block';
            outputText.innerHTML = '';
            let textContent = '';

            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                    'HTTP-Referer': 'https://github.com',  // OpenRouter需要这个
                    'X-Title': 'AI Article Generator'      // OpenRouter需要这个
                },
                signal: currentController.signal,
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: "system", content: "您是一位专业的组工信息写作助手..." },
                        { role: "user", content: promptContent }
                    ],
                    temperature: 0.7,
                    max_tokens: 2048
                })
            };

            // 根据不同的API提供商调整请求格式
            if (apiProvider === 'openrouter') {
                options.headers['HTTP-Referer'] = 'https://github.com';
                options.headers['X-Title'] = 'AI Article Generator';
            }

            const response = await fetch(config.endpoint, options);
            const data = await response.json();
            
            console.log('API Response:', data); // 添加调试日志
            
            // 添加数据结构验证
            if (!data) {
                throw new Error('API返回数据为空');
            }

            if (data.error) {
                throw new Error(data.error);
            }

            // 检查返回数据结构
            if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
                throw new Error('API返回数据格式错误：' + JSON.stringify(data));
            }

            const choice = data.choices[0];
            if (!choice || !choice.message || !choice.message.content) {
                throw new Error('API返回内容格式错误：' + JSON.stringify(choice));
            }

            const content = choice.message.content;
            textContent = content;
            outputText.innerHTML = marked.parse(textContent);

            // 添加复制按钮
            const copyButton = document.createElement('button');
            copyButton.textContent = '复制文章（但不复制格式啊）';
            copyButton.style.marginTop = '20px';
            copyButton.onclick = () => {
                navigator.clipboard.writeText(textContent)
                    .then(() => alert('文章已复制到剪贴板！'))
                    .catch(err => console.error('复制失败：', err));
            };
            outputText.appendChild(copyButton);

        } catch (error) {
            console.error('API请求错误:', error);
            let errorMessage = '发生错误：';
            if (error.name === 'AbortError') {
                errorMessage += '请求已取消';
            } else if (typeof error === 'object') {
                errorMessage += JSON.stringify(error.message || error);
            } else {
                errorMessage += error.toString();
            }
            document.getElementById('outputText').innerHTML = `<p style="color: red;">${errorMessage}</p>`;
            document.getElementById('loading').style.display = 'none';
        } finally {
            loading.style.display = 'none';
            currentController = null;
        }
    }

    // 取消按钮事件
    document.getElementById('cancelButton').addEventListener('click', () => {
        if (currentController) {
            currentController.abort();
        }
    });

    document.getElementById('generateButton').addEventListener('click', async () => {
        const region = document.getElementById('region').value;
        const topic = topicSelect.value === 'custom' ? customTopicInput.value : topicSelect.value;
        const highlights = document.getElementById('highlights').value;
        const inputText = document.getElementById('inputText').value;
        const outputText = document.getElementById('outputText');

        // 构建提示内容
        const promptContent = `
请针对以下内容生成一篇组工信息文章：
地区：${region}
主题方向：${topic}
工作亮点：${highlights}
具体内容：${inputText}

请确保文章符合以下要求：
1. 标题要突出特色，符合组工信息写作规范
2. 语言规范、严谨、平实
3. 突出地方特色，结合当地实际情况
4. 体现创新性和示范性
5. 重点突出工作亮点，突出组织部门工作特色
6. 参考示例文章的格式和写法!important
`;

        await makeApiRequest(promptContent);
    });

    // 赞助功能
    const sponsorLink = document.getElementById('sponsorLink');
    const qrModal = document.getElementById('qrModal');
    const qrClose = document.getElementById('qrClose');

    sponsorLink.addEventListener('click', function(e) {
        e.preventDefault();
        qrModal.style.display = 'block';
    });

    qrClose.addEventListener('click', function() {
        qrModal.style.display = 'none';
    });

    window.addEventListener('click', function(e) {
        if (e.target === qrModal) {
            qrModal.style.display = 'none';
        }
    });
});