// API客户端 - 通过后端代理调用阿里云API
// 使用方法: 先启动 node server.js，然后在浏览器中使用

// 是否使用代理模式
const USE_PROXY = true; // 使用后端服务器代理避免CORS问题

// 自动检测后端服务器地址
function getBackendURL() {
    // 如果在Electron环境中
    if (window.location.protocol === 'http:' && window.location.hostname === 'localhost' && window.location.port === '8080') {
        // 本地开发环境：前端在8080，后端在3001
        return 'http://localhost:3001';
    } else if (window.location.protocol === 'file:' || (window.electronAPI && window.electronAPI.platform)) {
        // Electron打包环境：使用localhost
        return 'http://localhost:3001';
    } else {
        // 其他情况也使用localhost
        return 'http://localhost:3001';
    }
}

const PROXY_URL = getBackendURL() + '/api/v1/services'; // 使用后端服务器的代理

// 调用阿里云API（通过代理）
async function callAliAPI(endpoint, data, apiKey) {
    if (USE_PROXY) {
        // 通过后端服务器代理调用
        try {
            // 构建完整的URL
            const fullUrl = PROXY_URL + endpoint;
            console.log('🔗 完整API URL:', fullUrl);
            
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(data)
            });
            
            return response;
        } catch (error) {
            console.warn('代理调用失败，使用模拟响应:', error);
            return new Response(JSON.stringify({
                output: {
                    choices: [{
                        message: {
                            content: getMockResponse(data)
                        }
                    }]
                }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } else {
        // 直接调用（可能会有CORS问题）
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        headers.append('Authorization', 'Bearer ' + apiKey);
        
        const response = await fetch(`https://dashscope.aliyuncs.com${endpoint}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });
        
        return response;
    }
}

// 模拟响应函数
function getMockResponse(data) {
    const prompt = data.messages?.[0]?.content || '';
    
    if (typeof prompt === 'string') {
        if (prompt.includes('识别这张图片中的所有英文文本')) {
            return 'The quick brown fox jumps over the lazy dog. This is a test sentence for OCR recognition.';
        } else if (prompt.includes('请将以下英文翻译成中文')) {
            const text = prompt.replace(/.*?\n\n/, '');
            return '这是中文翻译结果。';
        } else if (prompt.includes('请对以下英文句子进行详细分析')) {
            return `{
  "words": [
    {"english": "quick", "chinese": "快速的"},
    {"english": "brown fox", "chinese": "棕色的狐狸"},
    {"english": "jumps over", "chinese": "跳过"},
    {"english": "lazy dog", "chinese": "懒狗"}
  ],
  "structure": [
    {"component": "主语", "content": "The quick brown fox"},
    {"component": "谓语", "content": "jumps over"},
    {"component": "宾语", "content": "the lazy dog"}
  ],
  "scrambled": ["brown fox", "jumps over", "The quick", "lazy dog"]
}`;
        }
    } else if (Array.isArray(prompt)) {
        // 处理图片OCR
        return 'Hello world. This is a sample text from image.';
    }
    
    return '模拟AI响应';
}

// 重写原来的API调用函数
async function callAliOCR(imageBase64) {
    try {
        // 优先使用window.apiKey（特殊用户），否则从localStorage获取
        const apiKey = window.apiKey || localStorage.getItem('apiKey') || 'sk-be5a76fb81e844e0984fac68638bc69c';

        console.log('正在调用OCR API识别文本...');
        console.log('使用API Key:', apiKey ? apiKey.substring(0, 10) + '...' : '无');
        
        // 确保是完整的data URL格式
        let imageDataUrl = imageBase64;
        if (!imageDataUrl.startsWith('data:image')) {
            imageDataUrl = `data:image/jpeg;base64,${imageBase64}`;
        }
        
        const ocrPrompt = "请识别这张图片中的所有英文文本，保持原文格式输出。只输出识别到的英文文本内容，不要添加任何解释或说明。";
        
        // 通过后端代理调用（与翻译API保持一致）
        const backendURL = getBackendURL();
        const fullUrl = `${backendURL}/api/v1/services/ocr`;
        console.log('🔗 OCR API URL:', fullUrl);
        
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: imageDataUrl,
                prompt: ocrPrompt
            })
        });
        
        console.log('OCR API响应状态:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('OCR API错误响应:', errorText);
            
            if (response.status === 401) {
                throw new Error('API Key无效，请检查您的API Key是否正确');
            } else if (response.status === 400) {
                throw new Error('请求格式错误，请确保已开通qwen-vl-plus模型');
            } else {
                throw new Error(`OCR识别失败 (${response.status})`);
            }
        }
        
        const ocrData = await response.json();
        console.log('OCR识别结果:', ocrData);
        
        // OpenAI兼容格式的响应
        const rawText = ocrData.choices[0].message.content;
        console.log('识别到的原始文本:', rawText);
        console.log('原始文本长度:', rawText.length);
        
        // 🎯 使用正则表达式按句号、问号、感叹号分割句子
        console.log('=== 开始分割句子 ===');
        
        // 第一步：将换行符替换为空格（合并跨行句子）
        let processedText = rawText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
        console.log('处理换行后:', processedText);
        
        // 第二步：按句号、问号、感叹号分割
        // 使用更精确的正则：匹配句号/问号/感叹号，但要保留标点符号
        const sentencePattern = /[^.!?]+[.!?]+/g;
        let sentences = processedText.match(sentencePattern);
        
        if (!sentences || sentences.length === 0) {
            console.warn('⚠️ 正则分割失败，尝试简单分割');
            // 降级方案：简单按标点分割
            sentences = processedText
                .split(/([.!?]+)/)
                .reduce((acc, part, index, array) => {
                    if (index % 2 === 0 && part.trim()) {
                        const punctuation = array[index + 1] || '.';
                        acc.push((part.trim() + punctuation).trim());
                    }
                    return acc;
                }, []);
        }
        
        // 第三步：清理和验证
        sentences = sentences
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .filter(s => {
                // 必须包含英文字母
                return /[a-zA-Z]/.test(s);
            })
            .filter(s => {
                // 必须以标点符号结尾
                return /[.!?]$/.test(s);
            })
            .filter(s => {
                // 至少包含一个完整单词（2个字母以上）
                return /\b[a-zA-Z]{2,}\b/.test(s);
            });
        
        console.log('分割后的句子数组:', sentences);
        console.log(`✅ 共识别到 ${sentences.length} 个句子`);
        
        // 输出每个句子
        sentences.forEach((s, i) => {
            console.log(`  ${i + 1}. ${s}`);
        });
        
        console.log('======================');
        
        return sentences;
        
    } catch (error) {
        console.error('OCR调用错误:', error);
        
        if (error.message.includes('Failed to fetch')) {
            throw new Error('网络连接失败，请确保后端服务器正在运行 (node server.js)');
        }
        
        throw error;
    }
}

async function callAliTranslation(englishSentences) {
    const results = [];
    const total = englishSentences.length;
    
    // 优先使用window.apiKey（特殊用户），否则从localStorage获取
    const apiKey = window.apiKey || localStorage.getItem('apiKey') || 'sk-be5a76fb81e844e0984fac68638bc69c';
    
    console.log(`开始翻译 ${total} 个句子...`);
    
    for (let i = 0; i < englishSentences.length; i++) {
        const englishText = englishSentences[i];
        
        try {
            // 更新进度显示
            const progress = `正在翻译第 ${i + 1} / ${total} 句...`;
            console.log(progress);
            if (typeof updateLoadingProgress === 'function') {
                updateLoadingProgress(progress);
            }
            
            const prompt = `请将以下英文翻译成中文，要求准确、简洁、符合正式翻译风格。只输出中文翻译，不要添加任何其他内容：\n\n${englishText}`;
            
            console.log('翻译内容:', englishText.substring(0, 50) + '...');
            
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
            
            console.log(`第 ${i + 1} 句翻译API响应状态:`, response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`第 ${i + 1} 句翻译API错误响应:`, errorText);
                
                if (response.status === 401) {
                    throw new Error('API Key无效');
                } else if (response.status === 400) {
                    throw new Error('请求格式错误，请确保已开通qwen-max模型');
                } else {
                    throw new Error(`翻译失败 (${response.status})`);
                }
            }
            
            const data = await response.json();
            const chineseText = data.output.choices[0].message.content;
            
            console.log(`第 ${i + 1} 句翻译完成:`, chineseText);
            
            results.push({
                english: englishText,
                chinese: chineseText
            });
            
        } catch (error) {
            console.error(`第 ${i + 1} 句翻译错误:`, error);
            
            if (error.message.includes('Failed to fetch')) {
                throw new Error('网络连接失败，请确保后端服务器正在运行 (node server.js)');
            }
            
            // 即使某一句翻译失败，也记录下来，但继续翻译其他句子
            results.push({
                english: englishText,
                chinese: `[翻译失败: ${error.message}]`
            });
            
            console.warn(`跳过第 ${i + 1} 句，继续翻译下一句`);
        }
    }
    
    console.log(`翻译完成，共 ${results.length} 句`);
    return results;
}

async function analyzeSentence(sentence) {
    try {
        // 优先使用window.apiKey（特殊用户），否则从localStorage获取
        const apiKey = window.apiKey || localStorage.getItem('apiKey') || 'sk-be5a76fb81e844e0984fac68638bc69c';
        
        const prompt = `你是一个JSON生成器。请分析以下英文句子并返回纯JSON格式数据。

句子：${sentence.english}

返回格式要求：
{
  "words": [{"english": "单词或短语", "chinese": "中文释义"}],
  "structure": [{"component": "句子成分", "content": "英文内容"}],
  "scrambled": ["词组1", "词组2", "词组3"]
}

字段说明：
1. words: 关键词汇（优先识别2-5词的短语，如"look forward to"、"in the morning"）
2. structure: 句子结构分析（主语、谓语、宾语等）
3. scrambled: 打散的词组数组，必须满足：
   - 涵盖原句所有单词，一个都不能少
   - 优先使用有意义的词组（2-5个词）
   - 不包含标点符号
   - 重组后能完整还原原句

scrambled示例：
- "I am looking forward to the weekend." → ["I am", "looking forward to", "the weekend"]
- "The cat is sleeping on the bed." → ["The cat", "is sleeping", "on the bed"]
- "She has a beautiful smile." → ["She has", "a beautiful smile"]

⚠️ 关键要求：
1. 只输出JSON对象，不要有任何其他文字
2. 不要使用markdown代码块（不要用三个反引号包裹）
3. 直接以{开头，以}结尾
4. 确保JSON格式完全正确，可以被JSON.parse()解析
5. scrambled数组必须包含原句的所有单词

现在请输出JSON：`;

        console.log('正在分析句子:', sentence.english.substring(0, 50) + '...');
        console.log('使用API Key:', apiKey ? apiKey.substring(0, 10) + '...' : '无');
        
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
        
        console.log('句子分析API响应状态:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('句子分析API错误响应:', errorText);
            
            if (response.status === 401) {
                throw new Error('API Key无效');
            } else if (response.status === 400) {
                throw new Error('请求格式错误，请确保已开通qwen-max模型');
            } else {
                throw new Error(`句子分析失败 (${response.status})`);
            }
        }
        
        const data = await response.json();
        let content = data.output.choices[0].message.content;
        
        // 清理可能的markdown标记
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        console.log('句子分析原始结果:', content);
        
        const result = JSON.parse(content);
        
        // 清理scrambled数组中的标点符号
        if (result.scrambled && Array.isArray(result.scrambled)) {
            result.scrambled = result.scrambled.map(phrase => 
                phrase.replace(/[.,!?;:'"()""''—\-\[\]{}]/g, '').trim()
            ).filter(phrase => phrase.length > 0);
            
            console.log('AI生成的scrambled数组:', result.scrambled);
        }
        
        // 验证scrambled数组的完整性 - 支持词组验证
        const originalText = sentence.english.replace(/[.,!?;:'"()""''—\-\[\]{}]/g, '').trim();
        const scrambledText = result.scrambled.join(' ');
        
        console.log('=== Scrambled数组验证（词组模式）===');
        console.log('原句:', sentence.english);
        console.log('移除标点后:', originalText);
        console.log('scrambled重组:', scrambledText);
        console.log('scrambled数量:', result.scrambled.length);
        
        // 检查所有单词是否都包含在scrambled中
        const originalWords = originalText.split(/\s+/).filter(w => w.length > 0);
        const scrambledWords = scrambledText.split(/\s+/).filter(w => w.length > 0);
        
        // 检查单词覆盖是否完整
        const allWordsIncluded = originalWords.every(word => scrambledWords.includes(word)) &&
                                originalWords.length === scrambledWords.length;
        
        if (!allWordsIncluded) {
            console.warn('⚠️ AI生成的scrambled不完整！');
            console.warn('原句单词:', originalWords);
            console.warn('scrambled单词:', scrambledWords);
            
            // 降级：使用单词模式
            console.log('✅ 降级为单词模式');
            result.scrambled = originalWords;
        } else {
            console.log('✅ scrambled数组验证通过！');
        }
        
        // 🎯 限制词块数量不超过20个
        if (result.scrambled.length > 20) {
            console.log(`⚠️ 词块数量过多(${result.scrambled.length}个)，需要合并到20个以内`);
            
            // 计算需要合并的程度
            const targetCount = 18; // 目标18个，留有余地
            const mergeRatio = Math.ceil(result.scrambled.length / targetCount);
            
            const merged = [];
            for (let i = 0; i < result.scrambled.length; i += mergeRatio) {
                const chunk = result.scrambled.slice(i, i + mergeRatio).join(' ');
                merged.push(chunk);
            }
            
            result.scrambled = merged;
            console.log(`✅ 已合并为${result.scrambled.length}个词块:`, result.scrambled);
        }
        
        // 🎲 随机打乱scrambled数组顺序（Fisher-Yates洗牌算法）
        console.log('打乱前:', result.scrambled);
        for (let i = result.scrambled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result.scrambled[i], result.scrambled[j]] = [result.scrambled[j], result.scrambled[i]];
        }
        console.log('打乱后:', result.scrambled);
        console.log('========================');
        
        return result;
        
    } catch (error) {
        console.error('句子分析错误:', error);
        
        if (error.message.includes('Failed to fetch')) {
            throw new Error('网络连接失败，请确保后端服务器正在运行 (node server.js)');
        }
        
        throw error;
    }
}

console.log('🔧 API客户端已加载 (v2.1 - 2025-11-02 - 语法修复)');
console.log(`📡 使用${USE_PROXY ? '代理' : '直连'}模式`);
if (USE_PROXY) {
    console.log(`🌐 代理服务器: ${PROXY_URL}`);
    console.log('💡 请确保已运行: node server.js');
}

// 验证关键函数是否已定义
console.log('✅ 函数检查:');
console.log('  - callAliOCR:', typeof callAliOCR !== 'undefined' ? '✅' : '❌');
console.log('  - callAliTranslation:', typeof callAliTranslation !== 'undefined' ? '✅' : '❌');
console.log('  - analyzeSentence:', typeof analyzeSentence !== 'undefined' ? '✅' : '❌');
