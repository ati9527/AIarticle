document.addEventListener('DOMContentLoaded', function() {
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
                    'Content-Type': 'application/json'
                },
                signal: currentController.signal,
                body: JSON.stringify({
                    provider: apiProvider,
                    model: model,
                    messages: [
                        { role: "system", content: `您是一位专业的组工信息写作助手。请严格按照示例文章的写作结构和风格来写作：
1. 标题要凝练有力，突出地方特色和工作要点
2. 正文要分3-4个部分，每部分都要有个副标题
3. 每个部分要突出具体举措，要有具体的数据支撑
4. 文风要朴实严谨，采用总-分结构
5. 重点是体现组织部门工作的特色，避免写成工作总结` },
                        { role: "user", content: `请参考以下示例文章的结构，生成一篇组工信息：

示例文章：
标题：德阳市突出重点抓住关键全力推动基本培训任务落实落地

突出精准规范，答好组织部门"怎么调"问题。（第一部分具体工作）...
夯实办学保障，答好党校系统"怎么训"问题。（第二部分具体工作）...
聚焦关键对象，答好重点培训"抓什么"问题。（第三部分具体工作）...

请按照上述结构，围绕以下内容生成文章：
地区：${region}
主题方向：${topic}
工作亮点：${highlights}
具体内容：${inputText}

要求：
1. 保持示例文章的结构形式
2. 每个部分都要有明确的小标题
3. 重点突出创新性做法和具体数据
4. 语言要朴实严谨，避免空洞说教
5. 注意规范用语，使用组织工作专业用语` }
                    ]
                })
            };

            const response = await fetch(config.endpoint, options);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            const content = data.choices[0].message.content;
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
            document.getElementById('outputText').innerHTML = `<p style="color: red;">错误：${error.message}</p>`;
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