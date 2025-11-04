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
}

// 开始单词学习
async function startWordLearning() {
    const wordInputArea = document.getElementById('wordInputArea');
    const text = wordInputArea.value.trim();
    
    if (!text) {
        alert('请输入要学习的单词！');
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
        alert('没有找到有效的英文单词，请检查输入！');
        return;
    }
    
    if (recognizedWords.length > 20) {
        alert('单词数量超过20个，只会使用前20个单词进行学习');
        recognizedWords = recognizedWords.slice(0, 20);
    }
    
    showLoading(`正在获取 ${recognizedWords.length} 个单词的详细信息...`);
    
    try {
        // 获取每个单词的详细信息
        wordDetailsData = await getWordsDetails(recognizedWords);
        
        if (wordDetailsData.length === 0) {
            hideLoading();
            alert('单词信息获取失败，请重试');
            return;
        }
        
        showLoading('正在生成故事...');
        
        // 生成故事
        storyData = await generateStory(wordDetailsData);
        
        hideLoading();
        
        // 显示故事
        displayStory();
        
    } catch (error) {
        hideLoading();
        alert('处理失败：' + error.message);
    }
}

// 获取单词详细信息（带重试机制）
async function getWordsDetails(words) {
    const details = [];
    const maxRetries = 3; // 最大重试次数

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
                    '/api/v1/services/aigc/text-generation/generation',
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

                const detail = JSON.parse(content);

                // 验证必要字段
                if (!detail.word) detail.word = word;
                if (!detail.meanings || detail.meanings.length === 0) {
                    detail.meanings = [{ pos: 'n.', meaning: word }];
                }

                details.push(detail);
                console.log(`✅ 单词"${word}"信息获取成功 (尝试 ${retries + 1})`);
                success = true;

                // 实时显示已识别的单词
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
    const wordsList = wordsDetails.map((w, i) => {
        const mainMeaning = w.meanings && w.meanings[0] ? w.meanings[0].meaning : '';
        const mainPos = w.meanings && w.meanings[0] ? w.meanings[0].pos : '';
        return `${i + 1}. ${w.word} (${mainMeaning}, ${mainPos})`;
    }).join('\n');
    
    const wordCount = wordsDetails.length;
    let storyLength = '200-350字';
    if (wordCount > 15) {
        storyLength = '300-500字';
    } else if (wordCount > 10) {
        storyLength = '250-400字';
    }
    
    const prompt = `请用以下所有${wordCount}个单词编写一个有趣的故事。要求：
1. 必须使用所有${wordCount}个单词，一个都不能少
2. 情节要生动有趣、富有想象力、连贯流畅
3. 故事长度：${storyLength}
4. 可以使用单词的不同形式（如过去式、复数等）

单词列表：
${wordsList}

请按以下JSON格式返回：
{
  "chinese": "中文故事内容（用[word|释义|词性]标记单词位置）",
  "english": "英文故事内容（用[WORD|word|词性]标记单词位置）"
}

标记格式示例：
- 中文：今天妈妈给我[tell|讲述|vt.]了一个[story|故事|n.]
- 英文：Today my mother [TOLD|tell|vt.] me a [STORY|story|n.]

重要：只输出JSON，不要添加其他说明`;
    
    try {
        const response = await callAliAPI(
            '/api/v1/services/aigc/text-generation/generation',
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
        
        console.log('故事生成成功');
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

// 处理故事中的单词标记
function processStoryWithMarks(text, lang) {
    if (lang === 'cn') {
        // 中文：[word|释义|词性]
        return text.replace(/\[([^\|]+)\|([^\|]+)\|([^\]]+)\]/g, (match, word, meaning, pos) => {
            return `<span class="story-word" onclick="showWordDetail('${word.replace(/'/g, "\\'")}')">${word}<span class="story-word-detail">(${meaning}, ${pos})</span></span>`;
        });
    } else {
        // 英文：[WORD|word|pos]
        return text.replace(/\[([^\|]+)\|([^\|]+)\|([^\]]+)\]/g, (match, displayWord, baseWord, pos) => {
            // 查找单词的中文释义
            const wordDetail = wordDetailsData.find(w => w.word.toLowerCase() === baseWord.toLowerCase());
            const meaning = wordDetail && wordDetail.meanings && wordDetail.meanings[0] ? wordDetail.meanings[0].meaning : baseWord;
            return `<span class="story-word" onclick="showWordDetail('${baseWord.replace(/'/g, "\\'")}')">${displayWord}<button class="word-speak-btn" onclick="event.stopPropagation(); speakWord('${baseWord.replace(/'/g, "\\'")}')" style="margin-left:5px">🔊</button><span class="story-word-detail">(${meaning}, ${pos})</span></span>`;
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
function showWordDetail(word) {
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
        alert(`未找到该单词的详细信息：${word}\n\n请检查单词是否存在于学习列表中。`);
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
            if (typeof a === 'object' && a.en) {
                html += `<li><strong>${a.en}</strong> - ${a.cn || ''}</li>`;
            } else {
                html += `<li>${a}</li>`;
            }
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
    
    // 生成可点击切换的故事
    const processedStory = storyData.chinese.replace(/\[([^\|]+)\|([^\|]+)\|([^\]]+)\]/g, (match, word, meaning, pos) => {
        // 创建可点击切换的单词，初始显示英文
        return `<span class="toggle-word" 
                     data-english="${word}" 
                     data-chinese="${meaning}（${pos}）" 
                     onclick="toggleWordDisplay(this)">${word}</span>`;
    });
    
    storyDiv.innerHTML = processedStory;
}

// 切换单词显示（英文 ↔ 中文）
function toggleWordDisplay(element) {
    const isShowingChinese = element.classList.contains('showing-chinese');
    
    if (isShowingChinese) {
        // 切换回英文
        element.textContent = element.dataset.english;
        element.classList.remove('showing-chinese');
    } else {
        // 切换到中文
        element.textContent = element.dataset.chinese;
        element.classList.add('showing-chinese');
    }
    
    // 添加动画效果
    element.style.transform = 'scale(1.1)';
    setTimeout(() => {
        element.style.transform = 'scale(1)';
    }, 200);
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

    // 添加故事部分
    html += `
        <div class="summary-story-section">
            <h3>📖 中文故事</h3>
            <div class="summary-story-content">${storyData.chinese.replace(/\[([^\|]+)\|([^\|]+)\|([^\]]+)\]/g, '<strong>$1</strong>（$2，$3）')}</div>
        </div>
        <div class="summary-story-section">
            <h3>📖 英文故事</h3>
            <div class="summary-story-content">${storyData.english.replace(/\[([^\|]+)\|([^\|]+)\|([^\]]+)\]/g, (match, displayWord, baseWord, pos) => {
                const wordDetail = wordDetailsData.find(w => w.word.toLowerCase() === baseWord.toLowerCase());
                const meaning = wordDetail && wordDetail.meanings && wordDetail.meanings[0] ? wordDetail.meanings[0].meaning : baseWord;
                return `<strong>${displayWord}</strong>（${meaning}，${pos}）`;
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
            const synonymsText = word.synonyms.map(s =>
                typeof s === 'object' ? `${s.en} (${s.cn || ''})` : s
            ).join('、');
            html += `<div class="vocab-summary-detail-item"><strong>同义词：</strong>${synonymsText}</div>`;
        }

        // 反义词
        if (word.antonyms && word.antonyms.length > 0) {
            const antonymsText = word.antonyms.map(a =>
                typeof a === 'object' ? `${a.en} (${a.cn || ''})` : a
            ).join('、');
            html += `<div class="vocab-summary-detail-item"><strong>反义词：</strong>${antonymsText}</div>`;
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
        <p>${storyData.chinese.replace(/\[([^\|]+)\|([^\|]+)\|([^\]]+)\]/g, '$1（$2，$3）')}</p>
    </div>
    <div class="story-section">
        <h3>英文故事</h3>
        <p>${storyData.english.replace(/\[([^\|]+)\|([^\|]+)\|([^\]]+)\]/g, (match, displayWord, baseWord, pos) => {
            const wordDetail = wordDetailsData.find(w => w.word.toLowerCase() === baseWord.toLowerCase());
            const meaning = wordDetail && wordDetail.meanings && wordDetail.meanings[0] ? wordDetail.meanings[0].meaning : baseWord;
            return `${displayWord}（${meaning}，${pos}）`;
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
    
    const filename = `单词学习成果_${new Date().toISOString().slice(0,10)}.doc`;
    
    // 检测是否在Electron环境中
    if (window.electronAPI && window.electronAPI.saveWordDocument) {
        try {
            const result = await window.electronAPI.saveWordDocument(htmlContent, filename);
            
            if (result.success) {
                alert(`✅ 导出成功！\n\n文件已保存至：\n${result.filePath}`);
            } else if (result.canceled) {
                console.log('用户取消保存');
            } else {
                alert(`❌ 保存失败：${result.error || '未知错误'}`);
            }
        } catch (error) {
            alert(`❌ 导出失败：${error.message}`);
        }
    } else {
        // 浏览器环境
        const blob = new Blob(['\ufeff', htmlContent], {
            type: 'application/msword;charset=utf-8'
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        alert('✅ 导出成功！\n文件已保存到下载文件夹');
    }
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
