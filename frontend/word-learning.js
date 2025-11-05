// 单词学习功能模块
// 全局变量
let recognizedWords = [];
let storyData = {};
let wordDetailsData = [];

// 初始化单词输入
function initializeWordUpload() {
    const wordInputArea = document.getElementById('wordInputArea');
    const wordCountDisplay = document.getElementById('wordCountDisplay');
    const wordCountInfo = document.querySelector('.word-count-info');
    
    // 监听输入变化
    wordInputArea.addEventListener('input', function() {
        const text = this.value.trim();
        const words = text.split('\n')
            .map(w => w.trim())
            .filter(w => w.length > 0 && /^[a-zA-Z]+$/.test(w));
        
        const count = words.length;
        wordCountDisplay.textContent = `已输入 ${count} 个单词`;
        
        // 如果超过20个，显示警告
        if (count > 20) {
            wordCountInfo.classList.add('warning');
            wordCountDisplay.textContent = `⚠️ 已输入 ${count} 个单词（超出上限）`;
        } else {
            wordCountInfo.classList.remove('warning');
        }
    });
    
    // 初始化图片上传
    const wordUploadArea = document.getElementById('wordUploadArea');
    const wordImageInput = document.getElementById('wordImageInput');
    
    if (wordUploadArea && wordImageInput) {
        wordUploadArea.addEventListener('click', () => {
            wordImageInput.click();
        });
        
        wordImageInput.addEventListener('change', handleWordImageUpload);
        
        // 拖拽上传
        wordUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            wordUploadArea.style.borderColor = '#667eea';
            wordUploadArea.style.background = '#f8f9ff';
        });
        
        wordUploadArea.addEventListener('dragleave', () => {
            wordUploadArea.style.borderColor = '#ddd';
            wordUploadArea.style.background = 'white';
        });
        
        wordUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            wordUploadArea.style.borderColor = '#ddd';
            wordUploadArea.style.background = 'white';
            
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleWordImageFile(file);
            }
        });
    }
}

// 处理单词图片上传
async function handleWordImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        await handleWordImageFile(file);
    }
}

// 处理单词图片文件
async function handleWordImageFile(file) {
    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Image = e.target.result;
        
        showLoading('正在识别图片中的单词...');
        
        try {
            // 调用OCR识别
            const ocrResult = await callAliOCR(base64Image);
            
            // callAliOCR返回的是句子数组，需要合并为文本
            let ocrText = '';
            if (Array.isArray(ocrResult)) {
                ocrText = ocrResult.join(' ');
            } else {
                ocrText = String(ocrResult);
            }
            
            console.log('OCR识别文本:', ocrText);
            
            // 提取单词
            const words = ocrText.split(/[\s\n,，.。;；!！?？]+/)
                .map(w => w.trim())
                .filter(w => w.length > 0 && /^[a-zA-Z]+$/.test(w));
            
            if (words.length === 0) {
                hideLoading();
                await showWarning('未识别到有效的英文单词', '识别失败');
                return;
            }
            
            // 去重并限制数量
            recognizedWords = [...new Set(words)].slice(0, 20);
            
            hideLoading();
            
            // 自动填充到输入框
            document.getElementById('wordInputArea').value = recognizedWords.join('\n');
            document.getElementById('wordCountDisplay').textContent = `已识别 ${recognizedWords.length} 个单词`;
            
            // 提示用户
            let message = `已识别到 ${recognizedWords.length} 个单词`;
            if (words.length > 20) {
                message += `（原识别 ${words.length} 个，已限制为前20个）`;
            }
            message += '，是否开始学习？';
            
            // 自动开始学习
            const confirmed = await showConfirm(message, '开始学习');
            if (confirmed) {
                await startWordLearning();
            }
            
        } catch (error) {
            hideLoading();
            console.error('识别失败:', error);
            await showError('识别失败：' + error.message, '识别失败');
        }
    };
    reader.readAsDataURL(file);
}

// 开始单词学习
async function startWordLearning() {
    const wordInputArea = document.getElementById('wordInputArea');
    const text = wordInputArea.value.trim();
    
    if (!text) {
        await showWarning('请输入要学习的单词！', '提示');
        return;
    }
    
    // 提取并验证单词
    const words = text.split('\n')
        .map(w => w.trim())
        .filter(w => w.length > 0 && /^[a-zA-Z]+$/.test(w))
        .slice(0, 20); // 最多20个
    
    // 去重
    recognizedWords = [...new Set(words)];
    
    if (recognizedWords.length === 0) {
        await showWarning('没有找到有效的英文单词，请检查输入！', '输入错误');
        return;
    }
    
    if (recognizedWords.length > 20) {
        await showWarning('单词数量超过20个，只会使用前20个单词进行学习', '提示');
        recognizedWords = recognizedWords.slice(0, 20);
    }
    
    showLoading(`正在获取 ${recognizedWords.length} 个单词的详细信息...`);
    
    try {
        // 获取每个单词的详细信息
        wordDetailsData = await getWordsDetails(recognizedWords);
        
        if (wordDetailsData.length === 0) {
            hideLoading();
            await showError('单词信息获取失败，请重试', '获取失败');
            return;
        }
        
        showLoading('正在生成故事...');
        
        // 生成故事（带重试机制）
        storyData = await generateStoryWithRetry(wordDetailsData);
        
        hideLoading();
        
        // 显示故事
        displayStory();
        
    } catch (error) {
        hideLoading();
        await showError('处理失败：' + error.message, '处理失败');
    }
}

// 生成故事（带重试和用户确认机制）
async function generateStoryWithRetry(wordsDetails) {
    const maxRetries = 3;
    let currentAttempt = 0;
    
    while (true) {
        for (let i = 0; i < maxRetries; i++) {
            currentAttempt++;
            try {
                updateLoadingProgress(`正在生成故事... (尝试 ${currentAttempt})`);
                const story = await generateStory(wordsDetails);
                console.log(`✅ 故事生成成功 (第 ${currentAttempt} 次尝试)`);
                return story;
            } catch (error) {
                console.warn(`❌ 故事生成失败 (第 ${currentAttempt} 次尝试):`, error.message);
                
                // 如果还有重试次数，继续
                if (i < maxRetries - 1) {
                    updateLoadingProgress(`生成失败，正在重试... (${i + 2}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
                }
            }
        }
        
        // 3次尝试都失败了，询问用户
        hideLoading();
        
        const userChoice = await showRetryDialog(
            '故事生成失败',
            `已尝试 ${currentAttempt} 次，但故事生成失败。\n\n可能原因：\n• AI未能使用所有单词\n• 网络连接问题\n• API响应异常\n\n是否继续尝试？`,
            '继续尝试',
            '退出'
        );
        
        if (!userChoice) {
            throw new Error('用户取消了故事生成');
        }
        
        // 用户选择继续，显示加载并重置计数
        showLoading('继续生成故事...');
    }
}

// 显示重试对话框（类似句子学习的样式）
function showRetryDialog(title, message, confirmText, cancelText) {
    return new Promise((resolve) => {
        // 创建对话框
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const dialogBox = document.createElement('div');
        dialogBox.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        `;
        
        dialogBox.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #e74c3c; font-size: 24px;">
                ⚠️ ${title}
            </h3>
            <p style="margin: 0 0 30px 0; color: #555; line-height: 1.6; white-space: pre-line;">
                ${message}
            </p>
            <div style="display: flex; gap: 15px; justify-content: flex-end;">
                <button id="cancelBtn" style="
                    padding: 12px 30px;
                    border: 2px solid #ddd;
                    background: white;
                    color: #666;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 500;
                    transition: all 0.3s;
                ">
                    ${cancelText}
                </button>
                <button id="confirmBtn" style="
                    padding: 12px 30px;
                    border: none;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 500;
                    transition: all 0.3s;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                ">
                    ${confirmText}
                </button>
            </div>
        `;
        
        dialog.appendChild(dialogBox);
        document.body.appendChild(dialog);
        
        // 按钮悬停效果
        const cancelBtn = dialogBox.querySelector('#cancelBtn');
        const confirmBtn = dialogBox.querySelector('#confirmBtn');
        
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.background = '#f5f5f5';
            cancelBtn.style.borderColor = '#999';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = 'white';
            cancelBtn.style.borderColor = '#ddd';
        });
        
        confirmBtn.addEventListener('mouseenter', () => {
            confirmBtn.style.transform = 'translateY(-2px)';
            confirmBtn.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
        });
        confirmBtn.addEventListener('mouseleave', () => {
            confirmBtn.style.transform = 'translateY(0)';
            confirmBtn.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
        });
        
        // 事件监听
        cancelBtn.onclick = () => {
            document.body.removeChild(dialog);
            resolve(false);
        };
        
        confirmBtn.onclick = () => {
            document.body.removeChild(dialog);
            resolve(true);
        };
    });
}

// 获取单词详细信息（带重试机制）
async function getWordsDetails(words) {
    const details = [];
    const maxRetries = 3; // 最大重试次数
    
    // 获取API Key
    const apiKey = window.apiKey || localStorage.getItem('apiKey') || 'sk-be5a76fb81e844e0984fac68638bc69c';
    console.log('🔑 使用API Key:', apiKey ? apiKey.substring(0, 12) + '...' : '未设置');

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const progress = `正在获取单词信息 ${i + 1}/${words.length}...`;
        updateLoadingProgress(progress);

        let retries = 0;
        let success = false;

        while (retries < maxRetries && !success) {
            try {
                const prompt = `请提供单词"${word}"的详细信息，以JSON格式返回：
{
  "word": "${word}",
  "phonetic": "音标（使用/音标/格式）",
  "meanings": [
    {"pos": "词性（如n./v./adj.等）", "meaning": "中文释义"}
  ],
  "synonyms": [
    {"en": "同义词1", "cn": "中文翻译1"},
    {"en": "同义词2", "cn": "中文翻译2"}
  ],
  "antonyms": [
    {"en": "反义词1", "cn": "中文翻译1"},
    {"en": "反义词2", "cn": "中文翻译2"}
  ],
  "forms": {
    "past": {"form": "过去式", "cn": "中文翻译"},
    "plural": {"form": "复数形式", "cn": "中文翻译"},
    "comparative": {"form": "比较级", "cn": "中文翻译"},
    "superlative": {"form": "最高级", "cn": "中文翻译"}
  },
  "collocations": [
    {"en": "常用搭配1", "cn": "中文翻译1"},
    {"en": "常用搭配2", "cn": "中文翻译2"}
  ],
  "examples": [
    {"en": "英文例句1", "cn": "中文翻译1"},
    {"en": "英文例句2", "cn": "中文翻译2"}
  ]
}

注意：
1. forms中不适用的项设为null
2. 提供2-3个同义词和反义词（需包含中文翻译）
3. 提供2-3个固定搭配（需包含中文翻译）
4. 提供1-2个例句
5. 只输出JSON，不要添加说明`;

                const response = await callAliAPI(
                    '/aigc/text-generation/generation',
                    {
                        model: 'qwen-max',
                        input: {
                            messages: [{
                                role: 'user',
                                content: prompt
                            }]
                        },
                        parameters: {
                            result_format: 'message'
                        }
                    },
                    apiKey
                );

                if (!response.ok) {
                    retries++;
                    console.warn(`单词"${word}"信息获取失败（尝试 ${retries}/${maxRetries}），HTTP状态码: ${response.status}`);
                    if (retries < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒后重试
                        continue;
                    } else {
                        console.error(`单词"${word}"信息获取失败，已达到最大重试次数`);
                        throw new Error(`单词"${word}"信息获取失败`);
                    }
                }

                const data = await response.json();
                let content = data.output.choices[0].message.content;
                console.log(`单词"${word}"原始响应 (尝试 ${retries + 1}):`, content);

                content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

                // 尝试提取JSON对象
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    content = jsonMatch[0];
                }
                
                // 清理JSON：将方括号替换为圆括号（在字符串值中）
                // 使用正则表达式匹配 "meaning": "xxx[yyy]" 格式
                content = content.replace(/"([^"]*)\[([^\]]*)\]([^"]*)"/g, '"$1($2)$3"');
                
                // 修复AI可能返回的错误格式：将 ": (" 替换为 ": ["
                content = content.replace(/:\s*\(/g, ': [');
                // 修复对应的结束括号：将 ")\n" 或 "),\n" 替换为 "]\n" 或 "],\n"
                content = content.replace(/\)(\s*[,\n])/g, ']$1');
                
                // 清理中文引号
                content = content
                    .replace(/"/g, '"')
                    .replace(/"/g, '"')
                    .replace(/'/g, "'")
                    .replace(/'/g, "'");

                const detail = JSON.parse(content);

                // 验证必要字段
                if (!detail.word) detail.word = word;
                if (!detail.meanings || detail.meanings.length === 0) {
                    detail.meanings = [{ pos: 'n.', meaning: word }];
                }

                details.push(detail);
                console.log(`✅ 单词"${word}"信息获取成功 (尝试 ${retries + 1})`);
                success = true;

                // 实时显示已识别的单词（中文释义+发音按钮）
                const mainMeaning = detail.meanings[0].meaning;
                const mainPos = detail.meanings[0].pos;
                addRecognizedWord(word, mainMeaning, mainPos);

            } catch (error) {
                retries++;
                console.error(`单词"${word}"处理错误 (尝试 ${retries}/${maxRetries}):`, error);

                if (retries >= maxRetries) {
                    console.error(`单词"${word}"最终处理失败，使用降级方案`);
                    // 添加基本信息作为降级方案
                    const fallbackDetail = {
                        word: word,
                        phonetic: '',
                        meanings: [{ pos: 'n.', meaning: word }],
                        synonyms: [],
                        antonyms: [],
                        forms: {
                            past: null,
                            plural: null,
                            comparative: null,
                            superlative: null
                        },
                        collocations: [],
                        examples: []
                    };
                    details.push(fallbackDetail);

                    // 即使失败也显示单词
                    addRecognizedWord(word, word, 'n.');
                    success = true; // 标记为成功，避免无限循环
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒后重试
                }
            }
        }
    }

    return details;
}

// 生成故事
async function generateStory(wordsDetails) {
    // 获取API Key
    const apiKey = window.apiKey || localStorage.getItem('apiKey') || 'sk-be5a76fb81e844e0984fac68638bc69c';
    console.log('🔑 故事生成使用API Key:', apiKey ? apiKey.substring(0, 12) + '...' : '未设置');
    
    const wordsList = wordsDetails.map((w, i) => {
        const mainMeaning = w.meanings && w.meanings[0] ? w.meanings[0].meaning : '';
        const mainPos = w.meanings && w.meanings[0] ? w.meanings[0].pos : '';
        return `${i + 1}. ${w.word} (${mainMeaning}, ${mainPos})`;
    }).join('\n');
    
    const wordCount = wordsDetails.length;
    let storyLength = '200-350字';
    
    // 根据单词数量动态调整故事篇幅
    if (wordCount <= 2) {
        storyLength = '80-120字';
    } else if (wordCount <= 5) {
        storyLength = '120-180字';
    } else if (wordCount <= 8) {
        storyLength = '150-220字';
    } else if (wordCount <= 10) {
        storyLength = '180-280字';
    } else if (wordCount <= 15) {
        storyLength = '250-350字';
    } else if (wordCount <= 20) {
        storyLength = '300-450字';
    } else {
        storyLength = '350-500字';
    }
    
    const prompt = `你是一个故事生成器。请用以下${wordCount}个单词编写故事。

【必须使用的单词列表】共${wordCount}个：
${wordsList}

🚨 关键要求（非常重要）：
1. 必须使用列表中的所有${wordCount}个单词，一个都不能遗漏！
2. 每个单词至少使用一次（可以用变形：过去式、复数、进行时等）
3. 在生成故事前，请先在心里确认每个单词如何使用
4. 生成故事后，请自我检查是否真的用了所有${wordCount}个单词
5. **中文故事和英文故事中，所有生词都必须标注！一个都不能遗漏！**

故事要求：
- 情节生动有趣、连贯流畅
- 长度：${storyLength}
- 自然融入所有单词，不要生硬堆砌

JSON格式：
{
  "chinese": "中文故事（用[word|词性|释义]标记单词）",
  "english": "英文故事（用[WORD|词性|释义]标记单词）",
  "usedWords": ["word1", "word2", ...]
}

📏 标记格式（非常重要）：
- 中文故事：今天妈妈给我[tell|v.|讲述]了一个[story|n.|故事]
- 英文故事：Today my mother [TOLD|v.|讲述]me a [STORY|n.|故事]

标记说明：
- 中文故事中：[原形单词|词性|中文释义]
- 英文故事中：[大写变形|词性|中文释义]（大写部分是实际使用的形式，如TOLD、STORIES等）
- 词性格式：n. 或 v. 或 adj. 或 adv. 等
- **使用方括号[]，不是圆括号()**
- **中文故事和英文故事中，每个生词都必须标注，不能遗漏！**

示例：
如果单词是consequence(n. 结果)，在故事中：
- 中文：而这一切的[consequence|n.|结果]是...
- 英文：And as a [CONSEQUENCE|n.|结果]...

⚠️ 特别注意：
- 中文故事中，即使是“结果”这样的中文词，也要标注对应的英文单词consequence
- 不要只在英文故事中标注，中文故事中也必须标注所有生词
- 标注格式必须严格遵守：[单词|词性|释义] - 使用方括号

usedWords数组说明：
- 列出故事中实际使用的所有单词（原形）
- 这个数组必须包含全部${wordCount}个单词
- 用于验证是否遗漏了任何单词

⚠️ 自我检查清单：
在输出JSON前，请确认：
□ 故事中是否使用了全部${wordCount}个单词？
□ usedWords数组是否包含全部${wordCount}个单词？
□ 中文故事中每个单词是否都有标记？
□ 英文故事中每个单词是否都有标记？
□ 标记格式是否正确：[单词|词性|释义]？

输出要求：
1. 只输出JSON对象，不要其他文字
2. 不要使用markdown代码块
3. 直接以{开头，以}结尾
4. 确保usedWords数组包含全部${wordCount}个单词
5. 确保中文和英文故事中所有生词都有标记

现在请生成故事JSON：`;
    
    try {
        const response = await callAliAPI(
            '/aigc/text-generation/generation',
            {
                model: 'qwen-max',
                input: {
                    messages: [{
                        role: 'user',
                        content: prompt
                    }]
                },
                parameters: {
                    result_format: 'message'
                }
            },
            apiKey
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('故事生成API错误:', errorText);
            throw new Error(`故事生成失败 (${response.status})`);
        }
        
        const data = await response.json();
        console.log('故事生成完整响应:', data);
        
        let content = data.output.choices[0].message.content;
        console.log('故事原始内容:', content);
        
        content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        
        // 尝试提取JSON对象
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            content = jsonMatch[0];
        }
        
        console.log('故事清理后内容:', content);
        
        const storyData = JSON.parse(content);
        
        if (!storyData.chinese || !storyData.english) {
            throw new Error('故事格式不完整');
        }
        
        // 将圆括号格式转换为方括号格式（兼容旧数据）
        storyData.chinese = storyData.chinese.replace(/\(([^\|]+)\|([^\|]+)\|([^\)]+)\)/g, '[$1|$2|$3]');
        storyData.english = storyData.english.replace(/\(([^\|]+)\|([^\|]+)\|([^\)]+)\)/g, '[$1|$2|$3]');
        
        // 验证是否使用了所有单词
        console.log('=== 验证单词使用情况 ===');
        const providedWords = wordsDetails.map(w => w.word.toLowerCase());
        console.log('提供的单词 (共' + providedWords.length + '个):', providedWords);
        
        // 方法1: 从AI返回的usedWords中提取
        let usedWordsFromAI = [];
        if (storyData.usedWords && Array.isArray(storyData.usedWords)) {
            usedWordsFromAI = storyData.usedWords.map(w => w.toLowerCase());
            console.log('AI返回的usedWords:', usedWordsFromAI);
        }
        
        // 方法2: 从标记中提取
        const markPattern = /\(([^\|]+)\|/g;
        const matchesInMarks = [...storyData.english.matchAll(markPattern)];
        const usedWordsFromMarks = matchesInMarks.map(m => m[1].toLowerCase());
        console.log('从标记中提取的单词:', usedWordsFromMarks);
        
        // 方法3: 从英文故事全文中搜索（支持变形）
        const storyText = storyData.english.toLowerCase()
            .replace(/\(([^\)]+)\)/g, '$1') // 移除标记
            .replace(/[.,!?;:'"]/g, ' '); // 移除标点（保留圆括号内容）
        
        // 检查每个单词是否在故事中
        const missingWords = [];
        const foundWords = [];
        
        for (const word of providedWords) {
            let found = false;
            
            // 检查原形
            if (usedWordsFromAI.includes(word) || 
                usedWordsFromMarks.includes(word) ||
                new RegExp('\\b' + word + '\\b', 'i').test(storyText)) {
                found = true;
            }
            
            // 检查常见变形
            if (!found) {
                const variations = [
                    word + 's',      // 复数/第三人称单数
                    word + 'es',     // 复数
                    word + 'ed',     // 过去式
                    word + 'd',      // 过去式
                    word + 'ing',    // 进行时
                    word.replace(/y$/, 'ies'), // 复数 (y->ies)
                    word.replace(/y$/, 'ied'), // 过去式 (y->ied)
                    word.replace(/e$/, 'ing'), // 进行时 (去e加ing)
                    word + word.slice(-1) + 'ed', // 双写辅音+ed
                    word + word.slice(-1) + 'ing'  // 双写辅音+ing
                ];
                
                for (const variant of variations) {
                    if (new RegExp('\\b' + variant + '\\b', 'i').test(storyText)) {
                        found = true;
                        console.log(`  ✓ 找到 "${word}" 的变形: "${variant}"`);
                        break;
                    }
                }
            }
            
            if (found) {
                foundWords.push(word);
            } else {
                missingWords.push(word);
            }
        }
        
        console.log('已使用的单词 (' + foundWords.length + '个):', foundWords);
        
        if (missingWords.length > 0) {
            console.error('⚠️ 故事中缺少以下单词:', missingWords);
            console.error(`缺少 ${missingWords.length}/${providedWords.length} 个单词`);
            console.error('故事内容:', storyData.english.substring(0, 200) + '...');
            throw new Error(`故事未包含所有单词！缺少 ${missingWords.length} 个: ${missingWords.join(', ')}`);
        }
        
        console.log('✅ 所有 ' + providedWords.length + ' 个单词都已使用！');
        console.log('========================');
        return storyData;
        
    } catch (error) {
        console.error('故事生成错误:', error);
        throw new Error('故事生成失败: ' + error.message);
    }
}

// 显示故事
function displayStory() {
    document.getElementById('wordUploadPanel').style.display = 'none';
    document.getElementById('storyPanel').style.display = 'block';
    
    // 显示中文故事（处理标记）
    const chineseDiv = document.getElementById('chineseStory');
    chineseDiv.innerHTML = processStoryWithMarks(storyData.chinese, 'cn');
    
    // 显示英文故事（处理标记）
    const englishDiv = document.getElementById('englishStory');
    englishDiv.innerHTML = processStoryWithMarks(storyData.english, 'en');
    
    // 添加弹窗容器
    createWordDetailModal();
}

// 清理释义中的括号内容（保留主要释义）
function cleanMeaning(meaning) {
    // 移除所有括号及其内容，如：是（be动词的第二人称单复数现在时） -> 是
    return meaning.replace(/[（(][^）)]*[）)]/g, '').trim();
}

// 处理故事中的单词标记
function processStoryWithMarks(text, lang) {
    if (lang === 'cn') {
        // 中文：[word|词性|释义] -> word(词性, 释义) 小字灰色
        return text.replace(/\[([^\|]+)\|([^\|]+)\|([^\]]+)\]/g, (match, word, pos, meaning) => {
            const cleanedMeaning = cleanMeaning(meaning);
            const cleanedPos = pos.trim();
            return `<span class="story-word" onclick="showWordDetail('${word.replace(/'/g, "\\'")}')">${word}<span class="story-word-detail" style="font-size: 0.85em; color: #999; margin-left: 2px;">(${cleanedPos}, ${cleanedMeaning})</span></span>`;
        });
    } else {
        // 英文：[WORD|词性|释义] -> WORD(词性, 释义) 小字灰色
        return text.replace(/\[([^\|]+)\|([^\|]+)\|([^\]]+)\]/g, (match, displayWord, pos, meaning) => {
            const cleanedMeaning = cleanMeaning(meaning);
            const cleanedPos = pos.trim();
            // 从displayWord中提取基础单词（去除大写）
            const baseWord = displayWord.toLowerCase();
            return `<span class="story-word" onclick="showWordDetail('${baseWord.replace(/'/g, "\\'")}')">${displayWord}<button class="word-speak-btn" onclick="event.stopPropagation(); speakWord('${baseWord.replace(/'/g, "\\'")}')" style="margin-left:5px">🔊</button><span class="story-word-detail" style="font-size: 0.85em; color: #999; margin-left: 2px;">(${cleanedPos}, ${cleanedMeaning})</span></span>`;
        });
    }
}

// 创建单词详情弹窗
function createWordDetailModal() {
    if (document.getElementById('wordDetailModal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'wordDetailModal';
    modal.className = 'word-detail-modal';
    modal.innerHTML = '<div class="word-detail-content" id="wordDetailContent"></div>';
    modal.onclick = function(e) {
        if (e.target === modal) closeWordDetail();
    };
    document.body.appendChild(modal);
}

// 显示单词详情
async function showWordDetail(word) {
    // 清理单词（去除可能的空格和特殊字符）
    const cleanWord = word.trim().toLowerCase();
    console.log('查找单词:', cleanWord, '单词列表:', wordDetailsData.map(w => w.word));

    // 尝试精确匹配
    let detail = wordDetailsData.find(w => w.word.toLowerCase() === cleanWord);

    // 如果没找到，尝试模糊匹配（去除标点等）
    if (!detail) {
        const fuzzyWord = cleanWord.replace(/[^\w]/g, '');
        detail = wordDetailsData.find(w => w.word.toLowerCase().replace(/[^\w]/g, '') === fuzzyWord);
        if (detail) {
            console.log('通过模糊匹配找到单词:', detail.word);
        }
    }

    // 如果还是没找到，尝试部分匹配
    if (!detail) {
        detail = wordDetailsData.find(w =>
            w.word.toLowerCase().includes(cleanWord) || cleanWord.includes(w.word.toLowerCase())
        );
        if (detail) {
            console.log('通过部分匹配找到单词:', detail.word);
        }
    }

    if (!detail) {
        console.error('未找到单词:', cleanWord);
        await showError(`未找到该单词的详细信息：${word}\n\n请检查单词是否存在于学习列表中。`, '未找到单词');
        return;
    }

    const modal = document.getElementById('wordDetailModal');
    const content = document.getElementById('wordDetailContent');

    let html = `
        <button class="word-detail-close" onclick="closeWordDetail()">×</button>
        <div class="word-detail-header">
            <div class="word-detail-title">${detail.word}</div>
            <button class="speak-btn" onclick="speakWord('${detail.word}')">🔊</button>
            <div class="word-detail-phonetic">${detail.phonetic || ''}</div>
        </div>
    `;

    // 词性和释义
    if (detail.meanings && detail.meanings.length > 0) {
        html += '<div class="word-detail-section"><h4>📝 词性与释义</h4><ul>';
        detail.meanings.forEach(m => {
            html += `<li><strong>${m.pos}</strong> - ${m.meaning}</li>`;
        });
        html += '</ul></div>';
    }

    // 同义词
    if (detail.synonyms && detail.synonyms.length > 0) {
        html += `<div class="word-detail-section"><h4>🔄 同义词</h4><ul>`;
        detail.synonyms.forEach(s => {
            if (typeof s === 'object' && s.en) {
                html += `<li><strong>${s.en}</strong> - ${s.cn || ''}</li>`;
            } else {
                html += `<li>${s}</li>`;
            }
        });
        html += '</ul></div>';
    }

    // 反义词
    if (detail.antonyms && detail.antonyms.length > 0) {
        html += `<div class="word-detail-section"><h4>↔️ 反义词</h4><ul>`;
        detail.antonyms.forEach(a => {
            if (a && typeof a === 'object' && a.en) {
                html += `<li><strong>${a.en}</strong> - ${a.cn || ''}</li>`;
            } else if (a && typeof a === 'string') {
                html += `<li>${a}</li>`;
            }
            // 跳过null值
        });
        html += '</ul></div>';
    }

    // 词形变化
    if (detail.forms) {
        html += '<div class="word-detail-section"><h4>📐 词形变化</h4><ul>';
        if (detail.forms.past) {
            if (typeof detail.forms.past === 'object' && detail.forms.past.form) {
                html += `<li>过去式：<strong>${detail.forms.past.form}</strong> - ${detail.forms.past.cn || ''}</li>`;
            } else {
                html += `<li>过去式：${detail.forms.past}</li>`;
            }
        }
        if (detail.forms.plural) {
            if (typeof detail.forms.plural === 'object' && detail.forms.plural.form) {
                html += `<li>复数：<strong>${detail.forms.plural.form}</strong> - ${detail.forms.plural.cn || ''}</li>`;
            } else {
                html += `<li>复数：${detail.forms.plural}</li>`;
            }
        }
        if (detail.forms.comparative) {
            if (typeof detail.forms.comparative === 'object' && detail.forms.comparative.form) {
                html += `<li>比较级：<strong>${detail.forms.comparative.form}</strong> - ${detail.forms.comparative.cn || ''}</li>`;
            } else {
                html += `<li>比较级：${detail.forms.comparative}</li>`;
            }
        }
        if (detail.forms.superlative) {
            if (typeof detail.forms.superlative === 'object' && detail.forms.superlative.form) {
                html += `<li>最高级：<strong>${detail.forms.superlative.form}</strong> - ${detail.forms.superlative.cn || ''}</li>`;
            } else {
                html += `<li>最高级：${detail.forms.superlative}</li>`;
            }
        }
        html += '</ul></div>';
    }

    // 固定搭配
    if (detail.collocations && detail.collocations.length > 0) {
        html += '<div class="word-detail-section"><h4>🔗 固定搭配</h4><ul>';
        detail.collocations.forEach(c => {
            if (typeof c === 'object' && c.en) {
                html += `<li><strong>${c.en}</strong> - ${c.cn || ''}</li>`;
            } else {
                html += `<li>${c}</li>`;
            }
        });
        html += '</ul></div>';
    }

    // 例句
    if (detail.examples && detail.examples.length > 0) {
        html += '<div class="word-detail-section"><h4>💬 例句</h4>';
        detail.examples.forEach(ex => {
            html += `<div class="word-detail-example">
                <div class="english">${ex.en} <button class="word-speak-btn" onclick="speakText('${ex.en.replace(/'/g, "\\'")}')">🔊</button></div>
                <div class="chinese">${ex.cn}</div>
            </div>`;
        });
        html += '</div>';
    }

    content.innerHTML = html;
    modal.style.display = 'flex';
}

// 关闭单词详情
function closeWordDetail() {
    const modal = document.getElementById('wordDetailModal');
    if (modal) modal.style.display = 'none';
}

// 进入英译中练习
function nextToEnglishToChinese() {
    document.getElementById('storyPanel').style.display = 'none';
    document.getElementById('englishToChinesePanel').style.display = 'block';
    
    setupEnglishToChinese();
}

// 设置英译中练习（点击切换）
function setupEnglishToChinese() {
    const storyDiv = document.getElementById('en2cnStory');
    
    // 添加翻转卡样式
    if (!document.getElementById('flashcard-styles')) {
        const style = document.createElement('style');
        style.id = 'flashcard-styles';
        style.textContent = `
            .flashcard {
                display: inline-block;
                padding: 4px 12px;
                margin: 0 4px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                font-weight: 600;
                box-shadow: 0 3px 6px rgba(102, 126, 234, 0.4);
                position: relative;
                transform-style: preserve-3d;
                min-width: 60px;
                text-align: center;
            }
            .flashcard:hover {
                transform: translateY(-3px) scale(1.05);
                box-shadow: 0 6px 12px rgba(102, 126, 234, 0.5);
            }
            .flashcard.flipped {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                box-shadow: 0 3px 6px rgba(102, 126, 234, 0.4);
            }
            .flashcard-front, .flashcard-back {
                display: inline-block;
                backface-visibility: hidden;
            }
            @keyframes flip-in {
                0% { transform: rotateY(0deg); }
                50% { transform: rotateY(90deg); }
                100% { transform: rotateY(0deg); }
            }
            .flashcard.flipping {
                animation: flip-in 0.6s ease-in-out;
            }
        `;
        document.head.appendChild(style);
    }
    
    // 生成可点击切换的故事（翻转卡格式，中文释义不加方括号）
    const processedStory = storyData.chinese.replace(/\[([^\|]+)\|([^\|]+)\|([^\]]+)\]/g, (match, word, meaning, pos) => {
        // 创建翻转卡片，初始显示英文
        return `<span class="flashcard" 
                     data-word="${word}" 
                     data-meaning="${meaning}" 
                     data-pos="${pos}" 
                     onclick="flipCard(this)">
                    <span class="flashcard-front">${word}</span>
                    <span class="flashcard-back" style="display:none;">${pos} ${meaning}</span>
                </span>`;
    });
    
    storyDiv.innerHTML = processedStory;
}

// 翻转卡片（英文 ↔ 中文）
function flipCard(element) {
    const front = element.querySelector('.flashcard-front');
    const back = element.querySelector('.flashcard-back');
    const isFlipped = element.classList.contains('flipped');
    
    // 添加翻转动画类
    element.classList.add('flipping');
    
    // 动画中途切换内容
    setTimeout(() => {
        if (isFlipped) {
            // 翻回正面（英文）
            element.classList.remove('flipped');
            front.style.display = '';
            back.style.display = 'none';
        } else {
            // 翻到背面（中文释义）
            element.classList.add('flipped');
            front.style.display = 'none';
            back.style.display = '';
        }
    }, 300);
    
    // 移除动画类
    setTimeout(() => {
        element.classList.remove('flipping');
    }, 600);
}

// 显示单词记忆鼓励
function showWordEncouragement(type) {
    // 调用learning.js中的鼓励功能
    if (typeof showEncouragement === 'function') {
        showEncouragement();
    } else {
     console.log('showEncouragement函数未找到');
    }
    
    console.log(`✅ ${type === 'en2cn' ? '英译中' : '中译英'}记忆检测完成！`);
}

// 完成单词学习，进入总结
function finishWordLearning() {
    document.getElementById('englishToChinesePanel').style.display = 'none';
    document.getElementById('wordSummaryPanel').style.display = 'block';
    
    displayWordSummary();
}

// 显示单词总结
function displayWordSummary() {
    const summaryDiv = document.getElementById('wordSummaryList');

    let html = '';

    // 检查必要数据是否存在
    if (!storyData || !storyData.chinese || !storyData.english) {
        html += '<div class="error-message">故事数据丢失，请重新开始学习</div>';
        summaryDiv.innerHTML = html;
        return;
    }

    // 检查单词数据是否存在
    if (!wordDetailsData || wordDetailsData.length === 0) {
        html += '<div class="error-message">单词数据丢失，请重新开始学习</div>';
        summaryDiv.innerHTML = html;
        return;
    }

    // 添加故事部分（使用圆括号格式，小字灰色）
    html += `
        <div class="summary-story-section">
            <h3>📖 中文故事</h3>
            <div class="summary-story-content">${storyData.chinese.replace(/\[([^\|]+)\|([^\|]+)\|([^\]]+)\]/g, '<strong style="color: #667eea; font-weight: bold; background-color: #f0f4ff; padding: 2px 6px; border-radius: 3px;">$1</strong><span style="font-size: 0.85em; color: #999;">($2, $3)</span>')}</div>
        </div>
        <div class="summary-story-section">
            <h3>📖 英文故事</h3>
            <div class="summary-story-content">${storyData.english.replace(/\[([^\|]+)\|([^\|]+)\|([^\]]+)\]/g, (match, displayWord, baseWord, pos) => {
                const wordDetail = wordDetailsData.find(w => w.word.toLowerCase() === baseWord.toLowerCase());
                const meaning = wordDetail && wordDetail.meanings && wordDetail.meanings[0] ? wordDetail.meanings[0].meaning : baseWord;
                return `<strong style="color: #667eea; font-weight: bold; background-color: #f0f4ff; padding: 2px 6px; border-radius: 3px;">${displayWord}</strong><span style="font-size: 0.85em; color: #999;">(${meaning}, ${pos})</span>`;
            })}</div>
        </div>
        <h3 style="margin-top: 30px; color: #667eea; border-left: 4px solid #667eea; padding-left: 15px;">📚 单词详解</h3>
    `;

    // 单词列表
    wordDetailsData.forEach((word, index) => {
        const mainMeaning = word.meanings && word.meanings[0] ? word.meanings[0].meaning : '';
        const mainPos = word.meanings && word.meanings[0] ? word.meanings[0].pos : '';

        html += `
            <div class="vocab-summary-item">
                <div class="vocab-summary-header">
                    <div class="vocab-summary-word">${word.word}</div>
                    <button class="speak-btn" onclick="speakWord('${word.word}')">🔊</button>
                    <div class="vocab-summary-phonetic">${word.phonetic || ''}</div>
                    <div class="vocab-summary-pos">${mainPos}</div>
                </div>
                <div class="vocab-summary-meaning">${mainMeaning}</div>
                <div class="vocab-summary-details">
        `;

        // 同义词
        if (word.synonyms && word.synonyms.length > 0) {
            const synonymsText = word.synonyms.map(s => {
                if (typeof s === 'object' && s !== null) {
                    return `${s.en || ''} (${s.cn || ''})`;
                } else {
                    return s || '';
                }
            }).filter(text => text.trim() !== '').join('、');
            if (synonymsText) {
                html += `<div class="vocab-summary-detail-item"><strong>同义词：</strong>${synonymsText}</div>`;
            }
        }

        // 反义词
        if (word.antonyms && word.antonyms.length > 0) {
            const antonymsText = word.antonyms.map(a => {
                if (typeof a === 'object' && a !== null) {
                    return `${a.en || ''} (${a.cn || ''})`;
                } else {
                    return a || '';
                }
            }).filter(text => text.trim() !== '').join('、');
            if (antonymsText) {
                html += `<div class="vocab-summary-detail-item"><strong>反义词：</strong>${antonymsText}</div>`;
            }
        }

        // 词形变化
        if (word.forms && Object.keys(word.forms).some(k => word.forms[k])) {
            html += '<div class="vocab-summary-detail-item"><strong>词形变化：</strong>';
            const formItems = [];
            if (word.forms.past) {
                const pastText = typeof word.forms.past === 'object' ?
                    `过去式 ${word.forms.past.form} (${word.forms.past.cn || ''})` :
                    `过去式 ${word.forms.past}`;
                formItems.push(pastText);
            }
            if (word.forms.plural) {
                const pluralText = typeof word.forms.plural === 'object' ?
                    `复数 ${word.forms.plural.form} (${word.forms.plural.cn || ''})` :
                    `复数 ${word.forms.plural}`;
                formItems.push(pluralText);
            }
            if (word.forms.comparative) {
                const compText = typeof word.forms.comparative === 'object' ?
                    `比较级 ${word.forms.comparative.form} (${word.forms.comparative.cn || ''})` :
                    `比较级 ${word.forms.comparative}`;
                formItems.push(compText);
            }
            if (word.forms.superlative) {
                const supText = typeof word.forms.superlative === 'object' ?
                    `最高级 ${word.forms.superlative.form} (${word.forms.superlative.cn || ''})` :
                    `最高级 ${word.forms.superlative}`;
                formItems.push(supText);
            }
            html += formItems.join('、') + '</div>';
        }

        // 固定搭配
        if (word.collocations && word.collocations.length > 0) {
            const collocationsText = word.collocations.map(c =>
                typeof c === 'object' ? `${c.en} (${c.cn || ''})` : c
            ).join('、');
            html += `<div class="vocab-summary-detail-item"><strong>固定搭配：</strong>${collocationsText}</div>`;
        }

        // 例句
        if (word.examples && word.examples.length > 0) {
            html += '<div class="vocab-summary-detail-item"><strong>例句：</strong>';
            word.examples.forEach((ex, i) => {
                if (i > 0) html += '<br>';
                html += `${ex.en}<br><span style="color:#666;margin-left:20px;">${ex.cn}</span>`;
            });
            html += '</div>';
        }

        html += `</div></div>`;
    });

    summaryDiv.innerHTML = html;
}

// 导出单词学习成果为Word
async function exportWordLearning() {
    // 让用户选择导出格式
    const format = await showFormatSelectionDialog();
    if (!format) {
        console.log('用户取消导出');
        return;
    }
    
    console.log(`开始导出${format === 'pdf' ? 'PDF' : 'Word'}文档...`);
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>单词学习成果 - ${new Date().toLocaleDateString()}</title>
    <style>
        body {
            font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif;
            line-height: 1.5;
            max-width: 900px;
            margin: 20px auto;
            padding: 15px;
            font-size: 14px;
        }
        h1 {
            text-align: center;
            color: #2c3e50;
            border-bottom: 2px solid #667eea;
            padding-bottom: 8px;
            font-size: 20px;
            margin: 10px 0;
        }
        h2 {
            color: #667eea;
            margin-top: 15px;
            border-left: 4px solid #667eea;
            padding-left: 10px;
            font-size: 16px;
            margin-bottom: 8px;
        }
        h3 {
            font-size: 14px;
            margin: 5px 0;
        }
        .stats {
            background: #667eea;
            color: white;
            padding: 10px;
            border-radius: 5px;
            text-align: center;
            margin: 10px 0;
            font-size: 13px;
        }
        .stats p {
            margin: 3px 0;
        }
        .story-section {
            margin: 10px 0;
            padding: 10px;
            background: #f8f9ff;
            border-radius: 5px;
            border-left: 3px solid #667eea;
        }
        .story-section p {
            margin: 5px 0;
            line-height: 1.6;
        }
        .word-item {
            margin: 10px 0;
            padding: 10px;
            background: #f8f9ff;
            border-radius: 5px;
            border-left: 3px solid #667eea;
            page-break-inside: avoid;
        }
        .word-header {
            font-size: 16px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 3px;
        }
        .word-meaning {
            font-size: 14px;
            color: #555;
            margin: 3px 0;
        }
        .word-details {
            margin-top: 5px;
            padding-top: 5px;
            border-top: 1px solid #e0e0e0;
        }
        .detail-item {
            margin: 3px 0;
            color: #666;
            font-size: 13px;
            line-height: 1.4;
        }
        .detail-label {
            color: #667eea;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>单词学习成果</h1>
    
    <div class="stats">
        <p><strong>学习日期：</strong>${new Date().toLocaleString('zh-CN')}</p>
        <p><strong>学习单词数：</strong>${wordDetailsData.length} 个</p>
    </div>
    
    <h2>📖 故事记忆</h2>
    <div class="story-section">
        <h3>中文故事</h3>
        <p>${storyData.chinese.replace(/\[([^\|]+)\|([^\|]+)\|([^\]]+)\]/g, '$1($2, $3)')}</p>
    </div>
    <div class="story-section">
        <h3>英文故事</h3>
        <p>${storyData.english.replace(/\[([^\|]+)\|([^\|]+)\|([^\]]+)\]/g, (match, displayWord, baseWord, pos) => {
            const wordDetail = wordDetailsData.find(w => w.word.toLowerCase() === baseWord.toLowerCase());
            const meaning = wordDetail && wordDetail.meanings && wordDetail.meanings[0] ? wordDetail.meanings[0].meaning : baseWord;
            return `${displayWord}(${meaning}, ${pos})`;
        })}</p>
    </div>
    
    <h2>📚 单词详解</h2>
    ${wordDetailsData.map(word => {
        const mainMeaning = word.meanings && word.meanings[0] ? word.meanings[0].meaning : '';
        const mainPos = word.meanings && word.meanings[0] ? word.meanings[0].pos : '';
        
        // 处理同义词
        const synonymsText = word.synonyms && word.synonyms.length > 0 ? 
            word.synonyms.map(s => {
                if (typeof s === 'object' && s !== null && s.en) {
                    return `${s.en}${s.cn ? '(' + s.cn + ')' : ''}`;
                }
                return s || '';
            }).filter(s => s).join('、') : '';
        
        // 处理反义词
        const antonymsText = word.antonyms && word.antonyms.length > 0 ? 
            word.antonyms.map(a => {
                if (typeof a === 'object' && a !== null && a.en) {
                    return `${a.en}${a.cn ? '(' + a.cn + ')' : ''}`;
                }
                return a || '';
            }).filter(a => a).join('、') : '';
        
        // 处理词形变化
        let formsText = '';
        if (word.forms && typeof word.forms === 'object') {
            const formItems = [];
            if (word.forms.past) {
                if (typeof word.forms.past === 'object' && word.forms.past.form) {
                    formItems.push(`过去式 ${word.forms.past.form}${word.forms.past.cn ? '(' + word.forms.past.cn + ')' : ''}`);
                } else if (typeof word.forms.past === 'string') {
                    formItems.push(`过去式 ${word.forms.past}`);
                }
            }
            if (word.forms.plural) {
                if (typeof word.forms.plural === 'object' && word.forms.plural.form) {
                    formItems.push(`复数 ${word.forms.plural.form}${word.forms.plural.cn ? '(' + word.forms.plural.cn + ')' : ''}`);
                } else if (typeof word.forms.plural === 'string') {
                    formItems.push(`复数 ${word.forms.plural}`);
                }
            }
            if (word.forms.comparative) {
                if (typeof word.forms.comparative === 'object' && word.forms.comparative.form) {
                    formItems.push(`比较级 ${word.forms.comparative.form}${word.forms.comparative.cn ? '(' + word.forms.comparative.cn + ')' : ''}`);
                } else if (typeof word.forms.comparative === 'string') {
                    formItems.push(`比较级 ${word.forms.comparative}`);
                }
            }
            if (word.forms.superlative) {
                if (typeof word.forms.superlative === 'object' && word.forms.superlative.form) {
                    formItems.push(`最高级 ${word.forms.superlative.form}${word.forms.superlative.cn ? '(' + word.forms.superlative.cn + ')' : ''}`);
                } else if (typeof word.forms.superlative === 'string') {
                    formItems.push(`最高级 ${word.forms.superlative}`);
                }
            }
            formsText = formItems.join('、');
        }
        
        // 处理固定搭配
        const collocationsText = word.collocations && word.collocations.length > 0 ? 
            word.collocations.map(c => {
                if (typeof c === 'object' && c !== null && c.en) {
                    return `${c.en}${c.cn ? '(' + c.cn + ')' : ''}`;
                }
                return c || '';
            }).filter(c => c).join('、') : '';
        
        // 处理例句
        const examplesHtml = word.examples && word.examples.length > 0 ? 
            word.examples.map(ex => {
                if (typeof ex === 'object' && ex !== null && ex.en) {
                    return `<div class="detail-item"><span class="detail-label">例句：</span>${ex.en || ''}<br>${ex.cn || ''}</div>`;
                }
                return '';
            }).filter(ex => ex).join('') : '';
        
        return `
            <div class="word-item">
                <div class="word-header">${word.word} ${word.phonetic || ''}</div>
                <div class="word-meaning"><span class="detail-label">【${mainPos}】</span>${mainMeaning}</div>
                <div class="word-details">
                    ${synonymsText ? `<div class="detail-item"><span class="detail-label">同义词：</span>${synonymsText}</div>` : ''}
                    ${antonymsText ? `<div class="detail-item"><span class="detail-label">反义词：</span>${antonymsText}</div>` : ''}
                    ${formsText ? `<div class="detail-item"><span class="detail-label">词形：</span>${formsText}</div>` : ''}
                    ${collocationsText ? `<div class="detail-item"><span class="detail-label">搭配：</span>${collocationsText}</div>` : ''}
                    ${examplesHtml}
                </div>
            </div>
        `;
    }).join('')}
    
    <div style="text-align: center; margin-top: 40px; color: #999; font-size: 0.9em;">
        <p>睿叮AI英语学习助手 - 生成于 ${new Date().toLocaleString('zh-CN')}</p>
    </div>
</body>
</html>
    `;
    
    // 根据格式设置文件名和类型
    const dateStr = new Date().toISOString().slice(0,10);
    const filename = format === 'pdf' 
        ? `单词学习成果_${dateStr}.pdf`
        : `单词学习成果_${dateStr}.doc`;
    
    const mimeType = format === 'pdf'
        ? 'application/pdf'
        : 'application/msword';
    
    // 检测是否在Electron环境中
    if (window.electronAPI) {
        try {
            let result;
            if (format === 'pdf') {
                result = await window.electronAPI.savePDF(htmlContent, filename);
            } else {
                result = await window.electronAPI.saveWord(htmlContent, filename);
            }
            
            if (result.canceled) {
                console.log('ℹ️ 用户取消保存');
                return;
            }
            
            if (result.success) {
                console.log('✅ 导出成功！文件路径:', result.filePath);
                await showSuccess(`导出成功！\n\n文件已保存至：\n${result.filePath}`, '导出成功');
            } else {
                console.error('❌ 保存失败:', result.error);
                await showError(`保存失败：${result.error || '未知错误'}`, '导出失败');
            }
        } catch (error) {
            console.error('❌ 导出失败:', error);
            await showError(`导出失败：${error.message}`, '导出失败');
        }
    } else {
        // 浏览器环境
        if (format === 'pdf') {
            // PDF导出：使用打印功能
            await exportToPDF(htmlContent, filename);
        } else {
            // Word导出
            const blob = new Blob(['\ufeff', htmlContent], {
                type: `${mimeType};charset=utf-8`
            });
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            await showSuccess('导出成功！\n文件已保存到下载文件夹', '导出成功');
        }
    }
}

// 显示格式选择对话框
function showFormatSelectionDialog() {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        dialog.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 450px; text-align: center;">
                <h3 style="margin-bottom: 20px; color: #667eea; font-size: 18px;">选择导出格式</h3>
                <p style="color: #666; margin-bottom: 30px; font-size: 14px;">请选择您想要导出的文件格式</p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="exportWord" style="flex: 1; min-width: 140px; padding: 14px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 500; white-space: nowrap;">
                        📄 Word文档
                    </button>
                    <button id="exportPDF" style="flex: 1; min-width: 140px; padding: 14px 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 500; white-space: nowrap;">
                        📕 PDF文档
                    </button>
                </div>
                <button id="cancelExport" style="margin-top: 15px; padding: 10px 30px; background: #f0f0f0; color: #666; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">
                    取消
                </button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        document.getElementById('exportWord').onclick = () => {
            document.body.removeChild(dialog);
            resolve('word');
        };
        
        document.getElementById('exportPDF').onclick = () => {
            document.body.removeChild(dialog);
            resolve('pdf');
        };
        
        document.getElementById('cancelExport').onclick = () => {
            document.body.removeChild(dialog);
            resolve(null);
        };
        
        dialog.onclick = (e) => {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
                resolve(null);
            }
        };
    });
}

// PDF导出函数
async function exportToPDF(htmlContent, filename) {
    const filenameWithoutExt = filename.replace(/\.pdf$/i, '');
    console.log('🔍 准备导出PDF，文件名:', filenameWithoutExt);
    
    // 保存原始title
    const originalTitle = document.title;
    
    // 临时修改主页面title（某些浏览器会使用这个作为默认文件名）
    document.title = filenameWithoutExt;
    
    // 创建隐藏的iframe
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position: absolute; width: 0; height: 0; border: none;';
    document.body.appendChild(iframe);
    
    // 修改HTML内容，设置正确的title
    const modifiedHtml = htmlContent.replace(
        /<title>.*?<\/title>/i,
        `<title>${filenameWithoutExt}</title>`
    );
    
    // 写入HTML内容
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(modifiedHtml);
    iframeDoc.close();
    
    // 等待内容加载
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 触发打印对话框
    iframe.contentWindow.print();
    
    // 清理和恢复
    setTimeout(() => {
        document.body.removeChild(iframe);
        document.title = originalTitle; // 恢复原始title
    }, 1000);
    
    console.log('✅ PDF打印对话框已打开');
}

// 辅助函数：打乱数组顺序
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

console.log('📚 单词学习模块已加载');
