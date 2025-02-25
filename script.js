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
            
            if (!window.API_CONFIGS || !window.API_CONFIGS[apiProvider]) {
                throw new Error('API 配置错误');
            }

            const config = window.API_CONFIGS[apiProvider];
            const outputText = document.getElementById('outputText');
            const loading = document.getElementById('loading');

            if (currentController) {
                currentController.abort();
            }

            currentController = new AbortController();
            loading.style.display = 'block';
            outputText.innerHTML = '';
            
            const response = await fetch(config.endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://github.com',
                    'X-Title': 'AI Article Generator'
                },
                signal: currentController.signal,
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: "system", content: "您是一位组工信息写作助手。组工信息写作助手是专为组织部门设计的智能写作助手，通过实时对接最新组织工作政策、结构化写作方法论和典型案例数据库，能够精准生成选题立意深远、标题鲜明生动、数据论证扎实的优质信息，实现现象描述与本质提炼的统一，既突出六要素完整性又彰显工作创新性，助力用户快速产出符合“高深准精”要求、具有决策参考价值的组工信息。别写成工作总结！important示例：标题：德阳市突出重点抓住关键全力推动基本培训任务落实落地\n正文：突出精准规范，答好组织部门“怎么调”问题。加强统筹谋划，全面摸底、精准测算应训对象，对不同班次的具体培训对象、内容、方式、学制、周期作出明确规定，确保基本培训全覆盖、体系化。强化科学调训，统筹考虑上级调训、本级调训、行业系统调训等各类计划，建立基本培训选调台账，完善干部培训档案，避免同类培训专题重复设置、同一干部频繁参训、重点岗位干部常年不训。坚持按需施训，紧扣培训对象的工作特点和具体需求，实行“量体裁衣”“一班一策”，持续提升教育培训供给与岗位职责需求匹配度，不断增强基本培训针对性、实效性。\n夯实办学保障，答好党校系统“怎么训”问题。深化分类改革，整合区域培训资源，深化办学体制改革，新建扩建6 所市、县级党校，市县级党校年均承训能力大幅增强。提升教学质量，构建“核心+基础+特色”的优质课程体系，以习近平总书记德阳足迹为重点，打造三星堆博物馆等党的创新理论现场教学点20 余个，构建跨区域联动教学线路12 条，开发《探秘古蜀文明坚定文化自信》等课程50 余门。注重师资提能，完善青年教师“筑基”、骨干教师“培优”、高端人才“名师”的培养链条，搭建人才成长“实训场”，每年定期举办党校系统师资培训班2 期，轮训教师160余人。\n聚焦关键对象，答好重点培训“抓什么”问题。抓好“关键少数”系统培训，针对县（市、区）党政领导班子、经济部门县处级干部工作任务繁重的实际，将原有1 个月以上大班制教学模式调整为多期小班制教学模式，参训干部可根据班次设置，按需选择培训班次，确保按规划培训到位。抓好年轻干部理想信念教育，以“五史”、革命传统、中华传统美德、党风廉政教育为重点，打造相关课程48 门，课时量在中青班理论教育课中占比80%以上。" },
                        { role: "user", content: promptContent }
                    ],
                    stream: true
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '请求失败');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullContent = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    while (true) {
                        const lineEnd = buffer.indexOf('\n');
                        if (lineEnd === -1) break;

                        const line = buffer.slice(0, lineEnd).trim();
                        buffer = buffer.slice(lineEnd + 1);

                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') break;

                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices[0].delta.content;
                                if (content) {
                                    fullContent += content;
                                    outputText.innerHTML = marked.parse(fullContent);
                                }
                            } catch (e) {
                                console.log('解析响应出错：', e);
                            }
                        }
                    }
                }
            } finally {
                reader.cancel();
            }

            // 添加复制按钮
            const copyButton = document.createElement('button');
            copyButton.textContent = '复制文章（仅文本）';
            copyButton.style.marginTop = '20px';
            copyButton.onclick = () => {
                navigator.clipboard.writeText(fullContent)
                    .then(() => alert('文章已复制到剪贴板！'))
                    .catch(err => console.error('复制失败：', err));
            };
            outputText.appendChild(copyButton);

        } catch (error) {
            console.error('API请求错误:', error);
            let errorMessage = '发生错误：' + (error.message || error.toString());
            document.getElementById('outputText').innerHTML = `<p style="color: red;">${errorMessage}</p>`;
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