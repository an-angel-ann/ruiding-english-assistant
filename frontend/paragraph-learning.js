// ========== 段落学习模块 ==========

let paragraphData = null; // 存储段落学习数据
let currentParagraphIndex = 0; // 当前段落索引
let paragraphVocabulary = []; // 段落生词本
let selectedWords = []; // 用户选中的生词
let currentGroupIndex = 0; // 当前显示的组索引
let totalGroups = 0; // 总组数
let allGroupAnswers = {}; // 存储所有组的答案 {globalIndex: originalIndex}

// 初始化段落上传
function initializeParagraphUpload() {
    const uploadArea = document.getElementById('paragraphUploadArea');
    const fileInput = document.getElementById('paragraphImageInput');
    
    uploadArea.onclick = () => fileInput.click();
    
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            analyzeParagraphMaterial(file);
        }
    };
    
    // 拖拽上传
    uploadArea.ondragover = (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    };
    
    uploadArea.ondragleave = () => {
        uploadArea.classList.remove('drag-over');
    };
    
    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            analyzeParagraphMaterial(file);
        }
    };
}

// 从粘贴的文本直接分析
async function analyzeParagraphFromText() {
    try {
        const textInput = document.getElementById('paragraphTextInput');
        const text = textInput.value.trim();
        
        if (!text) {
            await showWarning('请先粘贴英语段落或文章', '提示');
            return;
        }
        
        // 显示loading并开始分析
        showLoading('AI正在分析段落...');
        
        // 验证并强制重建loadingMessage（如果需要）
        let checkOverlay = document.getElementById('loadingOverlay');
        let checkMessage = document.getElementById('loadingMessage');
        if (checkOverlay && !checkMessage) {
            console.log('⚠️ loadingMessage不存在，强制重建...');
            checkOverlay.innerHTML = `<div id="loadingMessage"></div>`;
        }
        
        // 等待loading元素完全渲染
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 将文本分割为句子用于动画展示
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).map(s => s.trim() + '.');
        
        // 开始学习提示动画
        showSentenceAnimation(sentences);
        
        // 调用AI分析段落
        const analysisResult = await analyzeParagraphWithAI(text);
        
        // 分析完成后隐藏
        hideSentenceAnimation();
        hideLoading();
        
        if (analysisResult) {
            paragraphData = analysisResult;
            currentParagraphIndex = 0;
            paragraphVocabulary = [];
            selectedWords = [];
            
            // 清空文本框
            textInput.value = '';
            
            // 进入步骤一：通篇浏览
            showOverviewPanel();
        }
    } catch (error) {
        hideLoading();
        hideSentenceAnimation();
        console.error('段落分析失败:', error);
        alert('段落分析失败: ' + error.message);
    }
}

// 步骤一：上传段落材料并分析
async function analyzeParagraphMaterial(imageFile) {
    try {
        // 初始化生词本为空
        paragraphVocabulary = [];
        selectedWords = [];
        updateFloatingVocab();
        
        if (!imageFile) {
            await showWarning('请选择图片文件', '提示');
            return;
        }
        
        console.log('📸 开始处理图片:', imageFile.name, '大小:', (imageFile.size / 1024).toFixed(2), 'KB');
        
        // 显示loading动画
        showLoading('正在识别文字...');
        
        // 将图片转换为Base64
        const reader = new FileReader();
        const imageBase64 = await new Promise((resolve, reject) => {
            reader.onload = (e) => {
                const base64 = e.target.result.split(',')[1];
                console.log('✅ 图片转换完成，Base64长度:', base64.length);
                resolve(base64);
            };
            reader.onerror = (error) => {
                console.error('❌ 图片读取失败:', error);
                reject(error);
            };
            reader.readAsDataURL(imageFile);
        });
        
        if (!imageBase64 || imageBase64.length < 100) {
            hideLoading();
            await showError('图片读取失败，请重试', '读取失败');
            return;
        }
        
        // OCR识别
        console.log('🔍 开始OCR识别...');
        const ocrResult = await callAliOCR(imageBase64);
        console.log('OCR识别结果:', ocrResult);
        
        // callAliOCR返回的是句子数组，需要合并为文本
        let ocrText = '';
        if (Array.isArray(ocrResult)) {
            ocrText = ocrResult.join(' ');
        } else if (typeof ocrResult === 'string') {
            ocrText = ocrResult;
        }
        
        // 验证OCR结果
        if (!ocrText || ocrText.trim().length === 0) {
            hideLoading();
            await showWarning('未能识别到文字内容，请重新上传清晰的图片', '识别失败');
            return;
        }
        
        // 检测无效的OCR结果（AI的默认回复）
        const invalidResponses = ['You are a helpful assistant', 'I am a helpful assistant', 'How can I help you'];
        if (invalidResponses.some(invalid => ocrText.includes(invalid))) {
            hideLoading();
            await showError('图片识别失败，可能是图片格式问题。建议使用"方式二：粘贴文本"功能。', '识别失败');
            console.error('❌ OCR返回了无效结果:', ocrText);
            return;
        }
        
        console.log('✅ OCR识别成功，文本长度:', ocrText.length);
        
        // 将OCR结果转为句子数组用于展示
        const sentences = Array.isArray(ocrResult) ? ocrResult : [ocrText];
        
        // 更新loading消息（不要hideLoading，直接更新）
        console.log('📝 更新loading消息为：AI正在分析段落...');
        showLoading('AI正在分析段落...');
        
        // 验证loading元素是否存在
        let checkOverlay = document.getElementById('loadingOverlay');
        let checkMessage = document.getElementById('loadingMessage');
        console.log('✅ loadingOverlay存在:', !!checkOverlay, 'loadingMessage存在:', !!checkMessage);
        
        // 如果loadingMessage不存在，强制重建
        if (checkOverlay && !checkMessage) {
            console.log('⚠️ loadingMessage不存在，强制重建...');
            checkOverlay.innerHTML = `<div id="loadingMessage"></div>`;
            checkMessage = document.getElementById('loadingMessage');
            console.log('✅ 重建后loadingMessage存在:', !!checkMessage);
        }
        
        // 等待loading元素完全渲染
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 再次验证
        const checkOverlay2 = document.getElementById('loadingOverlay');
        const checkMessage2 = document.getElementById('loadingMessage');
        console.log('✅ 等待500ms后，loadingOverlay存在:', !!checkOverlay2, 'loadingMessage存在:', !!checkMessage2);
        
        // 开始学习提示动画
        showSentenceAnimation(sentences);
        
        // 调用AI分析段落（动画会在分析期间持续显示）
        const analysisResult = await analyzeParagraphWithAI(ocrText);
        
        // 分析完成后隐藏
        hideSentenceAnimation();
        hideLoading();
        
        if (analysisResult) {
            paragraphData = analysisResult;
            currentParagraphIndex = 0;
            paragraphVocabulary = [];
            selectedWords = [];
            
            // 进入步骤一：通篇浏览
            showOverviewPanel();
        }
    } catch (error) {
        hideLoading();
        hideSentenceAnimation();
        console.error('段落分析失败:', error);
        await showError('段落分析失败: ' + error.message, '分析失败');
    }
}

// 显示段落学习界面
function showOverviewPanel() {
    document.getElementById('paragraphUploadPanel').style.display = 'none';
    document.getElementById('paragraphOverviewPanel').style.display = 'block';
    document.getElementById('floatingVocabBall').style.display = 'block';
    
    // 显示全文（支持生词选择）
    const fullTextDiv = document.getElementById('paragraphFullText');
    const allText = paragraphData.paragraphs.map(p => 
        p.sentences.map(s => s.english).join(' ')
    ).join('\n\n');
    
    // 添加简洁动感的生词提示（粉色主题）
    const vocabTip = `
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(240, 147, 251, 0.3); display: flex; align-items: center; gap: 12px; animation: slideIn 0.5s ease-out;">
            <span style="font-size: 20px; animation: pulse 2s infinite;">💡</span>
            <span style="font-size: 14px; font-weight: 500;">遇到生词？选中它，自动添加到生词本！</span>
        </div>
        <style>
            @keyframes slideIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
        </style>
    `;
    
    fullTextDiv.innerHTML = vocabTip + allText.split('\n\n').map(para => 
        `<p class="selectable-text" style="margin-bottom: 20px; text-indent: 2em; line-height: 1.8; cursor: text;">${para}</p>`
    ).join('');
    
    // 添加生词选择功能
    setupWordSelectionForOverview();
}

// 为步骤一设置生词选择功能
function setupWordSelectionForOverview() {
    const selectableTexts = document.querySelectorAll('#paragraphFullText .selectable-text');
    
    selectableTexts.forEach(text => {
        text.addEventListener('mouseup', function(e) {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            // 限制最小长度为2个字符，避免误选
            if (selectedText && selectedText.length >= 2) {
                // 检查是否已存在
                const exists = selectedWords.some(w => w.word.toLowerCase() === selectedText.toLowerCase());
                if (!exists) {
                    selectedWords.push({ word: selectedText });
                    console.log('✅ 添加生词:', selectedText);
                    
                    // 使用更安全的方式高亮显示
                    try {
                        const range = selection.getRangeAt(0);
                        
                        // 检查range是否有效且在当前元素内
                        if (range && range.commonAncestorContainer && 
                            (range.commonAncestorContainer === text || text.contains(range.commonAncestorContainer))) {
                            
                            const span = document.createElement('span');
                            span.className = 'selected-word';
                            span.style.cssText = 'background: #fff3cd; padding: 2px 4px; border-radius: 3px; cursor: pointer; font-weight: 500;';
                            span.textContent = selectedText;
                            span.title = '点击取消选中';
                            span.onclick = function(e) {
                                e.stopPropagation();
                                // 点击取消选中
                                const index = selectedWords.findIndex(w => w.word === selectedText);
                                if (index > -1) {
                                    selectedWords.splice(index, 1);
                                    // 用文本节点替换
                                    const textNode = document.createTextNode(selectedText);
                                    this.parentNode.replaceChild(textNode, this);
                                    console.log('❌ 移除生词:', selectedText);
                                }
                            };
                            
                            range.deleteContents();
                            range.insertNode(span);
                        }
                    } catch (error) {
                        console.error('高亮显示失败:', error);
                    }
                }
                selection.removeAllRanges();
            }
        });
    });
}

// 开始学习（从步骤一进入步骤二）
async function startParagraphLearning() {
    // 如果步骤一有选中的生词，先翻译
    if (selectedWords.length > 0) {
        showLoading('正在翻译生词...');
        
        // 强制重建loadingMessage（如果需要）
        let checkOverlay = document.getElementById('loadingOverlay');
        let checkMessage = document.getElementById('loadingMessage');
        if (checkOverlay && !checkMessage) {
            checkOverlay.innerHTML = `<div id="loadingMessage"></div>`;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        showSentenceAnimation([]); // 显示学习提示动画
        const translations = await translateSelectedWords();
        hideSentenceAnimation();
        hideLoading();
        
        // 添加到生词本
        paragraphVocabulary.push(...translations);
        updateFloatingVocab();
        
        // 清空选中的生词（避免重复翻译）
        selectedWords = [];
    }
    
    document.getElementById('paragraphOverviewPanel').style.display = 'none';
    document.getElementById('paragraphMeaningPanel').style.display = 'block';
    showSentenceMeaningPanel();
}

// 学习心理学提示语
const learningTips = [
    '每日坚持使用睿叮才能学好英语喔！',
    '想成为一枚学霸？课上认真听讲争取一遍过，课下就可以好好放松去玩了。',
    '语言学习的黄金法则：理解输入 + 大量练习 = 流利表达。',
    '研究表明，分散学习比集中学习效果更好，每天30分钟胜过周末3小时。',
    '阅读时遇到生词，先猜测意思再查词典，记忆效果会更好哦！',
    '朗读是提升语感的最佳方法，大声读出来吧！',
    '学习新单词时，造个句子比单纯背诵记得更牢固。',
    '睡前复习当天学的内容，大脑会在睡眠中帮你巩固记忆。',
    '不要害怕犯错，错误是学习过程中最好的老师。',
    '设定小目标，每天进步一点点，一年后你会惊讶于自己的成长。',
    '听力训练要循序渐进，从慢速开始，逐步提高难度。',
    '词汇量的积累需要时间，但坚持每天学10个新词，一年就是3650个！',
    '语法是工具不是目的，理解了就用，用多了自然就熟练了。',
    '看英文电影时，第一遍看字幕，第二遍不看，第三遍跟着说。',
    '写作时不要追求完美，先写出来，再慢慢修改。',
    '学习语言就像健身，需要持续的练习才能保持状态。',
    '遇到难句子？试着把它拆分成小块，逐个理解。',
    '口语练习不需要完美的发音，清晰表达才是关键。',
    '阅读英文原著时，不要每个词都查，先读完整段理解大意。',
    '学习效率 = 专注时间 × 学习方法，两者缺一不可。',
    '复习的最佳时机：学习后1小时、1天、1周、1月。',
    '用外语思考比翻译更重要，试着直接用外语想问题。',
    '听不懂没关系，多听几遍，耳朵会慢慢适应的。',
    '学习语言要有耐心，罗马不是一天建成的。',
    '找一个学习伙伴，互相鼓励，进步会更快。',
    '把手机语言设置成英文，沉浸式学习效果更好。',
    '每天用英语写日记，记录生活的同时提升写作能力。',
    '听英文歌曲，跟着唱，既娱乐又学习。',
    '阅读时遇到好句子，记下来，模仿着写。',
    '语言学习没有捷径，但有正确的方法。',
    '不要只背单词，要学会在语境中使用它们。',
    '发音不标准？多模仿，多练习，会越来越好的。',
    '学习新语法时，找5个例句，自己再造5个句子。',
    '阅读速度慢？先提高词汇量，速度自然就快了。',
    '听力材料要选择略高于自己水平的，这样进步最快。',
    '学习累了就休息，劳逸结合才能走得更远。',
    '把学到的知识教给别人，是最好的复习方法。',
    '不要和别人比进度，每个人的节奏不同。',
    '相信自己，你一定能学好英语！',
    '今天的努力，是明天的实力。',
    '语言学习是一场马拉松，不是百米冲刺。',
    '每一次练习都是进步，加油！',
    '学习英语，打开世界的大门。',
    '坚持就是胜利，你已经很棒了！',
    '记住：输入（听读）+ 输出（说写）= 语言能力。',
    '碎片时间也能学习，充分利用每一分钟。',
    '学习要主动，不要等着知识来找你。',
    '保持好奇心，对英语世界充满探索欲。',
    '你的每一次努力，睿叮都看在眼里，为你加油！'
];

// 全局标志控制动画
let isAnimationRunning = false;

// 更新段落进度条（与句子学习样式一致）
function updateParagraphProgress(stepName) {
    const totalParagraphs = paragraphData.paragraphs.length;
    const progress = ((currentParagraphIndex + 1) / totalParagraphs) * 100;
    
    // 更新进度条填充
    const progressFill = document.getElementById(`paragraph${stepName}ProgressFill`);
    if (progressFill) {
        progressFill.style.width = progress + '%';
    }
    
    // 更新文字显示
    const currentSpan = document.getElementById(`paragraph${stepName}Current`);
    const totalSpan = document.getElementById(`paragraph${stepName}Total`);
    if (currentSpan) currentSpan.textContent = currentParagraphIndex + 1;
    if (totalSpan) totalSpan.textContent = totalParagraphs;
}

// 显示学习提示动画（替代句子动画）
function showSentenceAnimation(sentences) {
    console.log('🎬 开始显示学习提示动画');
    isAnimationRunning = true;
    let retryCount = 0;
    const maxRetries = 10; // 最多重试10次（10秒）
    
    // 随机打乱提示语顺序
    const shuffledTips = [...learningTips].sort(() => Math.random() - 0.5);
    let currentIndex = 0;
    
    function showNextTip() {
        // 使用全局标志而非检查DOM
        if (!isAnimationRunning) {
            console.log('⚠️ 动画已停止');
            return;
        }
        
        const loadingMessage = document.getElementById('loadingMessage');
        if (!loadingMessage) {
            retryCount++;
            if (retryCount < maxRetries) {
                console.log(`⚠️ loading元素不存在，第${retryCount}次重试...`);
                // 等待1秒后重试
                window.paragraphAnimationTimer = setTimeout(showNextTip, 1000);
            } else {
                console.log('❌ loading元素始终未创建，停止动画');
                isAnimationRunning = false;
            }
            return;
        }
        
        // 找到loading元素后，重置重试计数
        retryCount = 0;
        
        const tip = shuffledTips[currentIndex % shuffledTips.length];
        console.log(`💡 显示提示 ${currentIndex + 1}:`, tip);
        loadingMessage.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
                <!-- 可爱的加载动画 -->
                <div style="position: relative; width: 80px; height: 80px;">
                    <div style="position: absolute; width: 100%; height: 100%; border: 4px solid transparent; border-top-color: #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <div style="position: absolute; width: 100%; height: 100%; border: 4px solid transparent; border-right-color: #764ba2; border-radius: 50%; animation: spin 1.5s linear infinite reverse;"></div>
                    <img src="xiaoding.png" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; animation: float 2s ease-in-out infinite;" alt="小叮">
                </div>
                
                <!-- 小叮说话气泡 -->
                <div style="position: relative; max-width: 500px; padding: 20px 25px; background: white; border-radius: 20px; box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15); animation: popIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);">
                    <!-- 气泡尖角 -->
                    <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 10px solid white;"></div>
                    
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                        <div style="flex-shrink: 0; font-size: 24px; animation: wave 1s ease-in-out infinite;">👋</div>
                        <div>
                            <div style="font-size: 14px; color: #667eea; font-weight: 600; margin-bottom: 8px;">小叮说：</div>
                            <div style="font-size: 15px; color: #333; line-height: 1.8;">${tip}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes float {
                    0%, 100% { transform: translate(-50%, -50%) translateY(0); }
                    50% { transform: translate(-50%, -50%) translateY(-8px); }
                }
                @keyframes popIn {
                    0% { transform: scale(0.8); opacity: 0; }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes wave {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-15deg); }
                    75% { transform: rotate(15deg); }
                }
            </style>
        `;
        currentIndex++;
        window.paragraphAnimationTimer = setTimeout(showNextTip, 4000); // 每4秒切换一条
    }
    
    // 立即显示第一条
    showNextTip();
}

// 隐藏句子动画
function hideSentenceAnimation() {
    console.log('🛑 停止学习提示动画');
    isAnimationRunning = false;
    // 清除所有定时器
    if (window.paragraphAnimationTimer) {
        clearTimeout(window.paragraphAnimationTimer);
        window.paragraphAnimationTimer = null;
    }
}

// 调用AI分析段落
async function analyzeParagraphWithAI(text) {
    const apiKey = localStorage.getItem('apiKey') || 'sk-be5a76fb81e844e0984fac68638bc69c';
    if (!apiKey) {
        throw new Error('请先设置API密钥');
    }
    
    const prompt = `请分析以下英语文本，并按照JSON格式返回分析结果。

文本内容：
${text}

请返回以下JSON格式（必须是纯JSON，不要有任何其他文字）：
{
    "paragraphs": [
        {
            "sentences": [
                {
                    "english": "英文句子",
                    "chinese": "中文翻译",
                    "semantic": "语义分析（精炼表述）",
                    "keyword": "逻辑关键词（3-5字，如：引入主题、举例说明、转折对比等）",
                    "summary": "句义概要（10-15字，简洁概括该句的核心意思）"
                }
            ],
            "sections": [
                {
                    "sentenceIndexes": [0, 1],
                    "role": "总起概括",
                    "description": "简短描述该小节的作用",
                    "summary": "句群概要（15-20字，概括该句群的整体意思）"
                }
            ]
        }
    ]
}

要求：
1. **识别自然段分隔**：根据以下特征识别段落边界
   - 句子开头有明显缩进（2个或以上空格）
   - 段落之间有空行
   - 语义上的自然段落划分
2. **长段落必须分段（重要）**：
   - 统计每个自然段的句子数量
   - 如果句子数 > 6，必须拆分为多个paragraph
   - 拆分原则：按语义和逻辑划分，每段3-6句
   - 例如：8句话必须拆分为2段（如4+4或5+3）
   - 例如：10句话必须拆分为2段（如5+5或6+4）
   - 例如：15句话必须拆分为3段（如5+5+5）
3. 将文本按自然段分割成多个paragraph对象
4. **每个句子必须包含**：
   - english: 英文原句
   - chinese: 中文翻译
   - semantic: 语义分析
   - keyword: 逻辑关键词（3-5字，如：引入主题、举例说明、转折对比、因果关系、总结归纳等）
   - summary: 句义概要（10-15字，简洁概括该句的核心意思）
5. 将每个自然段的句子按语义分成小节（sections）
6. **每个句群（section）必须包含**：
   - sentenceIndexes: 包含的句子索引
   - role: 逻辑作用（7个字以内，如：总起概括、提供例证、转折对比、总结归纳等）
   - description: 简短描述
   - summary: 句群概要（20-30字，必须包含至少2个关键点，用分号或顿号分隔。如果句群只有1句话，也要提炼出2个要点）
7. 必须返回纯JSON格式`;

    // 使用阿里云API代理
    const responseObj = await callAliAPI(
        '/aigc/text-generation/generation',
        {
            model: 'qwen-max',
            input: {
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            },
            parameters: {
                result_format: 'message'
            }
        },
        apiKey
    );
    
    // callAliAPI返回Response对象，需要解析JSON
    const response = await responseObj.json();
    console.log('段落分析API响应:', response);
    
    if (!response.output || !response.output.choices || response.output.choices.length === 0) {
        console.error('API返回数据:', response);
        throw new Error('API返回数据格式错误');
    }
    
    const content = response.output.choices[0].message.content;
    
    // 提取JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('AI返回格式错误');
    }
    
    // 清理JSON字符串：替换中文引号为英文引号
    let jsonStr = jsonMatch[0]
        .replace(/"/g, '"')  // 中文左引号
        .replace(/"/g, '"')  // 中文右引号
        .replace(/'/g, "'")  // 中文左单引号
        .replace(/'/g, "'"); // 中文右单引号
    
    console.log('清理后的JSON:', jsonStr.substring(0, 500) + '...');
    
    const parsedData = JSON.parse(jsonStr);
    
    // 验证并修复缺失的chinese字段 - 调用AI重新翻译
    if (parsedData.paragraphs) {
        const missingTranslations = [];
        
        parsedData.paragraphs.forEach((paragraph, pIndex) => {
            if (paragraph.sentences) {
                paragraph.sentences.forEach((sentence, sIndex) => {
                    if (!sentence.chinese || sentence.chinese === 'undefined' || sentence.chinese.trim() === '') {
                        console.warn(`⚠️ 段落${pIndex + 1}句子${sIndex + 1}缺少中文翻译，需要重新翻译`);
                        missingTranslations.push({
                            pIndex,
                            sIndex,
                            english: sentence.english
                        });
                    }
                });
            }
        });
        
        // 如果有缺失的翻译，调用AI批量翻译
        if (missingTranslations.length > 0) {
            console.log(`🔄 发现${missingTranslations.length}个句子缺少中文翻译，正在重新翻译...`);
            
            // 同步等待翻译完成
            const translatePromises = missingTranslations.map(async (item) => {
                try {
                    const translation = await translateSingleSentence(item.english, apiKey);
                    parsedData.paragraphs[item.pIndex].sentences[item.sIndex].chinese = translation;
                    console.log(`✅ 段落${item.pIndex + 1}句子${item.sIndex + 1}翻译完成: ${translation}`);
                } catch (error) {
                    console.error(`❌ 段落${item.pIndex + 1}句子${item.sIndex + 1}翻译失败:`, error);
                    parsedData.paragraphs[item.pIndex].sentences[item.sIndex].chinese = '翻译失败，请重试';
                }
            });
            
            // 等待所有翻译完成
            await Promise.all(translatePromises);
        }
    }
    
    return parsedData;
}

// 翻译单个句子
async function translateSingleSentence(englishText, apiKey) {
    const prompt = `请将以下英文句子翻译成中文，只返回中文翻译，不要有任何其他内容：

${englishText}`;

    const responseObj = await callAliAPI(
        '/aigc/text-generation/generation',
        {
            model: 'qwen-max',
            input: {
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            },
            parameters: {
                result_format: 'message'
            }
        },
        apiKey
    );
    
    const response = await responseObj.json();
    
    if (!response.output || !response.output.choices || response.output.choices.length === 0) {
        throw new Error('翻译API返回数据格式错误');
    }
    
    return response.output.choices[0].message.content.trim();
}

// 步骤二：显示句义辨别面板（五句一组，支持翻页）
function showSentenceMeaningPanel() {
    document.getElementById('paragraphUploadPanel').style.display = 'none';
    document.getElementById('paragraphMeaningPanel').style.display = 'block';
    
    // 重置按钮状态
    const checkBtn = document.querySelector('#paragraphMeaningPanel .btn-check');
    const nextBtn = document.getElementById('meaningNextBtn');
    checkBtn.style.display = 'inline-block';
    checkBtn.textContent = '检查答案';
    checkBtn.onclick = checkMeaningAnswers;
    nextBtn.style.display = 'none';
    
    // 更新进度条
    updateParagraphProgress('Meaning');
    
    const paragraph = paragraphData.paragraphs[currentParagraphIndex];
    const sentences = paragraph.sentences;
    
    // 三句一组分组
    const groupSize = 3;
    const groups = [];
    for (let i = 0; i < sentences.length; i += groupSize) {
        groups.push(sentences.slice(i, i + groupSize));
    }
    
    totalGroups = groups.length;
    currentGroupIndex = 0;
    allGroupAnswers = {}; // 重置答案存储
    
    // 显示当前组
    showCurrentGroup(groups, groupSize);
}

// 显示当前组的句子
function showCurrentGroup(groups, groupSize) {
    const group = groups[currentGroupIndex];
    
    // 上方：英文句子（当前组）
    const leftPanel = document.getElementById('paragraphEnglishSentences');
    leftPanel.innerHTML = `
        <div class="sentence-group" style="padding: 25px; background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-radius: 12px; border: 2px solid #667eea30;">
            <h4 style="color: #667eea; margin-bottom: 20px; font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px;">第 ${currentGroupIndex + 1} / ${totalGroups} 组</span>
                <span>英文句子</span>
            </h4>
            ${group.map((s, localIndex) => {
                const globalIndex = currentGroupIndex * groupSize + localIndex;
                // 检查是否已有答案
                const savedAnswer = allGroupAnswers[globalIndex];
                const savedMeaningHTML = savedAnswer !== undefined ? 
                    `<div class="draggable-meaning" draggable="true" data-original-index="${savedAnswer}" style="margin: 0; padding: 12px 15px; background: white; border-radius: 8px; cursor: move; border: 2px solid #667eea; font-size: 14px; line-height: 1.6; color: #333; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);">
                        ${paragraphData.paragraphs[currentParagraphIndex].sentences[savedAnswer].chinese || paragraphData.paragraphs[currentParagraphIndex].sentences[savedAnswer].english || '翻译缺失'}
                    </div>` : '';
                
                return `
                    <div class="paragraph-sentence-item" data-index="${globalIndex}" style="margin-bottom: 15px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1); border-left: 4px solid #667eea; display: flex; flex-direction: column; gap: 10px;">
                        <div class="sentence-text-container" style="flex-shrink: 0;">
                            <div class="sentence-text selectable-text" data-sentence-index="${globalIndex}" style="font-size: 15px; line-height: 1.6; color: #333; user-select: text; cursor: text; padding: 8px 0;">
                                ${s.english}
                            </div>
                        </div>
                        <div class="drop-zone-container" style="flex-shrink: 0;">
                            <div class="drop-zone" data-target="${globalIndex}" style="min-height: 50px; border: 2px dashed #667eea; border-radius: 6px; padding: 10px; background: #f8f9ff; text-align: center; color: #999; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-wrap: wrap;">
                                ${savedMeaningHTML || '拖拽中文翻译到这里'}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    // 下方：中文翻译（打乱顺序，过滤已放置的答案）
    const rightPanel = document.getElementById('paragraphChineseOptions');
    const groupWithIndex = group.map((s, localIndex) => ({
        ...s,
        originalIndex: currentGroupIndex * groupSize + localIndex
    }));
    
    // 过滤掉已经被放置的选项
    const usedIndexes = new Set(Object.values(allGroupAnswers));
    const availableOptions = groupWithIndex.filter(s => !usedIndexes.has(s.originalIndex));
    const shuffled = shuffleArray(availableOptions);
    
    rightPanel.innerHTML = `
        <div class="meaning-group" style="padding: 30px; background: linear-gradient(135deg, #764ba215 0%, #667eea15 100%); border-radius: 12px; border: 2px solid #764ba230;">
            <h4 style="color: #764ba2; margin-bottom: 25px; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
                <span style="background: linear-gradient(135deg, #764ba2 0%, #667eea 100%); color: white; padding: 6px 14px; border-radius: 20px; font-size: 13px;">第 ${currentGroupIndex + 1} / ${totalGroups} 组</span>
                <span>中文翻译（拖拽到上方对应位置）</span>
            </h4>
            <div id="meaningOptionsContainer" style="display: flex; flex-wrap: wrap; gap: 10px;">
                ${shuffled.map(s => `
                    <div class="draggable-meaning" draggable="true" data-original-index="${s.originalIndex}" style="padding: 12px 15px; background: white; border-radius: 8px; cursor: move; border: 2px solid #764ba2; font-size: 14px; line-height: 1.6; color: #333; transition: all 0.3s; box-shadow: 0 2px 8px rgba(118, 75, 162, 0.1);">
                        ${s.chinese || s.english || '翻译缺失'}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // 添加翻页按钮
    updatePaginationButtons();
    
    // 添加拖拽功能
    setupMeaningDragAndDrop();
    
    // 添加生词选择功能
    setupWordSelection();
}

// 更新翻页按钮（放在检查答案上方）- 只在超过1组时显示
function updatePaginationButtons() {
    const checkButton = document.querySelector('#paragraphMeaningPanel .btn-check');
    const buttonContainer = checkButton.parentElement;
    
    // 移除旧的翻页按钮
    const oldPagination = buttonContainer.querySelector('.pagination-buttons');
    if (oldPagination) {
        oldPagination.remove();
    }
    
    // 只在超过1组时显示翻页按钮
    if (totalGroups > 1) {
        const paginationHTML = `
            <div class="pagination-buttons" style="display: flex; gap: 10px; justify-content: center; margin-bottom: 15px;">
                <button onclick="previousGroup()" ${currentGroupIndex === 0 ? 'disabled' : ''} style="padding: 10px 20px; background: ${currentGroupIndex === 0 ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}; color: white; border: none; border-radius: 8px; cursor: ${currentGroupIndex === 0 ? 'not-allowed' : 'pointer'}; font-size: 14px;">
                    上一组
                </button>
                <button onclick="nextGroup()" ${currentGroupIndex === totalGroups - 1 ? 'disabled' : ''} style="padding: 10px 20px; background: ${currentGroupIndex === totalGroups - 1 ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}; color: white; border: none; border-radius: 8px; cursor: ${currentGroupIndex === totalGroups - 1 ? 'not-allowed' : 'pointer'}; font-size: 14px;">
                    下一组
                </button>
            </div>
        `;
        
        buttonContainer.insertAdjacentHTML('afterbegin', paginationHTML);
    }
}

// 上一组
function previousGroup() {
    if (currentGroupIndex > 0) {
        currentGroupIndex--;
        const paragraph = paragraphData.paragraphs[currentParagraphIndex];
        const sentences = paragraph.sentences;
        const groupSize = 3;
        const groups = [];
        for (let i = 0; i < sentences.length; i += groupSize) {
            groups.push(sentences.slice(i, i + groupSize));
        }
        showCurrentGroup(groups, groupSize);
    }
}

// 下一组
function nextGroup() {
    if (currentGroupIndex < totalGroups - 1) {
        currentGroupIndex++;
        const paragraph = paragraphData.paragraphs[currentParagraphIndex];
        const sentences = paragraph.sentences;
        const groupSize = 3;
        const groups = [];
        for (let i = 0; i < sentences.length; i += groupSize) {
            groups.push(sentences.slice(i, i + groupSize));
        }
        showCurrentGroup(groups, groupSize);
    }
}

// 设置拖拽功能
function setupMeaningDragAndDrop() {
    const draggables = document.querySelectorAll('.draggable-meaning');
    const dropZones = document.querySelectorAll('#paragraphEnglishSentences .drop-zone');
    
    // 为所有可拖拽元素添加事件（包括选项区和已放置的）
    draggables.forEach(draggable => {
        // 避免重复添加事件
        if (draggable.dataset.dragEventsAdded) return;
        draggable.dataset.dragEventsAdded = 'true';
        
        draggable.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', draggable.dataset.originalIndex);
            draggable.classList.add('dragging');
        });
        
        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging');
        });
    });
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });
        
        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            
            const originalIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const draggable = document.querySelector(`.draggable-meaning[data-original-index="${originalIndex}"]`);
            
            // 如果drop zone已有内容，将其放回原始位置
            if (zone.children.length > 0) {
                const existing = zone.children[0];
                const existingOriginalIndex = parseInt(existing.dataset.originalIndex);
                
                // 找到选项容器
                const optionsContainer = document.getElementById('meaningOptionsContainer');
                
                if (optionsContainer) {
                    const allOptions = Array.from(optionsContainer.querySelectorAll('.draggable-meaning'));
                    
                    // 找到应该插入的位置（按originalIndex排序）
                    let insertBefore = null;
                    for (let option of allOptions) {
                        const optionIndex = parseInt(option.dataset.originalIndex);
                        if (optionIndex > existingOriginalIndex) {
                            insertBefore = option;
                            break;
                        }
                    }
                    
                    // 插入到正确位置
                    if (insertBefore) {
                        optionsContainer.insertBefore(existing, insertBefore);
                    } else {
                        optionsContainer.appendChild(existing);
                    }
                }
                
                // 删除旧答案
                const targetIndex = parseInt(zone.dataset.target);
                delete allGroupAnswers[targetIndex];
            }
            
            // 清空zone内容（包括提示文字）
            zone.innerHTML = '';
            zone.appendChild(draggable);
            
            // 保存答案到全局变量
            const targetIndex = parseInt(zone.dataset.target);
            allGroupAnswers[targetIndex] = originalIndex;
        });
    });
}

// 设置生词选择功能（支持取消选中）
function setupWordSelection() {
    const selectableTexts = document.querySelectorAll('.selectable-text');
    
    selectableTexts.forEach(text => {
        text.addEventListener('mouseup', function(e) {
            // 检查是否点击了已标记的单词（取消选中）
            if (e.target.tagName === 'MARK') {
                const word = e.target.textContent.trim();
                const sentenceIndex = parseInt(this.dataset.sentenceIndex);
                
                // 从selectedWords中移除
                selectedWords = selectedWords.filter(w => 
                    !(w.word === word && w.sentenceIndex === sentenceIndex)
                );
                
                // 移除标记
                e.target.outerHTML = e.target.textContent;
                return;
            }
            
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (selectedText && selectedText.length > 0) {
                const sentenceIndex = parseInt(this.dataset.sentenceIndex);
                
                // 检查是否已选择
                const exists = selectedWords.some(w => 
                    w.word === selectedText && w.sentenceIndex === sentenceIndex
                );
                
                if (!exists) {
                    // 只保存英文单词
                    selectedWords.push({
                        word: selectedText,
                        sentenceIndex: sentenceIndex,
                        sentence: paragraphData.paragraphs[currentParagraphIndex].sentences[sentenceIndex].english
                    });
                    
                    // 高亮显示
                    highlightSelectedWord(this, selectedText);
                }
                
                selection.removeAllRanges();
            }
        });
    });
}

// 高亮选中的单词（红色标记，可点击取消）
function highlightSelectedWord(element, word) {
    const html = element.innerHTML;
    // 转义特殊字符
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedWord})`, 'gi');
    element.innerHTML = html.replace(regex, '<mark style="background-color: #ffebee; color: #d32f2f; padding: 2px 4px; border-radius: 3px; font-weight: 500; cursor: pointer;" title="点击取消选中">$1</mark>');
}

// 检查句义辨别答案（检查所有组）
async function checkMeaningAnswers() {
    const paragraph = paragraphData.paragraphs[currentParagraphIndex];
    const totalSentences = paragraph.sentences.length;
    let allCorrect = true;
    const errors = [];
    
    // 检查所有句子是否都已匹配
    for (let i = 0; i < totalSentences; i++) {
        if (allGroupAnswers[i] === undefined) {
            await showWarning('请完成所有句子的匹配', '提示');
            return;
        }
        
        if (allGroupAnswers[i] !== i) {
            allCorrect = false;
            errors.push(i);
        }
    }
    
    // 显示所有组的结果
    showAllGroupsResults(errors);
    
    if (allCorrect) {
        showEncouragement();
        setTimeout(() => {
            // 当前段落完成，进入步骤三
            const checkBtn = document.querySelector('#paragraphMeaningPanel .btn-check');
            const nextBtn = document.getElementById('meaningNextBtn');
            checkBtn.style.display = 'none';
            nextBtn.style.display = 'inline-block';
        }, 1500);
    } else {
        await showWarning(`有 ${errors.length} 处错误，请查看红色标记的位置`, '答题提示');
    }
}

// 显示所有组的检查结果
function showAllGroupsResults(errors) {
    const paragraph = paragraphData.paragraphs[currentParagraphIndex];
    const sentences = paragraph.sentences;
    const groupSize = 3; // 改为3句一组，与显示时保持一致
    const groups = [];
    for (let i = 0; i < sentences.length; i += groupSize) {
        groups.push(sentences.slice(i, i + groupSize));
    }
    
    // 重新渲染所有组，显示结果
    const leftPanel = document.getElementById('paragraphEnglishSentences');
    leftPanel.innerHTML = groups.map((group, groupIndex) => `
        <div class="sentence-group" style="margin-bottom: 20px; padding: 20px; background: #f8f9ff; border-radius: 10px;">
            <h4 style="color: #667eea; margin-bottom: 15px; font-size: 14px;">第 ${groupIndex + 1} 组</h4>
            ${group.map((s, localIndex) => {
                const globalIndex = groupIndex * groupSize + localIndex;
                const isCorrect = allGroupAnswers[globalIndex] === globalIndex;
                const borderColor = isCorrect ? '#4caf50' : '#f44336';
                const bgColor = isCorrect ? '#e8f5e9' : '#ffebee';
                const savedAnswer = allGroupAnswers[globalIndex];
                
                return `
                    <div class="paragraph-sentence-item" data-index="${globalIndex}" style="margin-bottom: 15px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 10px;">
                        <div class="sentence-text-container" style="flex-shrink: 0;">
                            <div class="sentence-text" style="font-size: 15px; line-height: 1.6; color: #333; padding: 8px 0;">
                                ${s.english}
                            </div>
                        </div>
                        <div class="drop-zone-container" style="flex-shrink: 0;">
                            <div class="drop-zone" style="min-height: 50px; border: 3px dashed ${borderColor}; border-radius: 6px; padding: 10px; background: ${bgColor}; display: flex; align-items: center; justify-content: center;">
                                ${savedAnswer !== undefined ? `
                                    <div style="padding: 12px 15px; background: white; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #333;">
                                        ${sentences[savedAnswer].chinese}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `).join('');
}

// 下一步：结构分析（继续当前段落）
function nextToStructureAnalysis() {
    document.getElementById('paragraphMeaningPanel').style.display = 'none';
    document.getElementById('paragraphStructurePanel').style.display = 'block';
    
    showStructureAnalysisPanel();
}

// 显示结构分析面板（新版本）
async function showStructureAnalysisPanel() {
    // 重置按钮状态
    const checkBtn = document.querySelector('#paragraphStructurePanel .btn-check');
    const nextBtn = document.getElementById('structureNextBtn');
    checkBtn.style.display = 'inline-block';
    nextBtn.style.display = 'none';
    
    // 更新进度条
    updateParagraphProgress('Structure');
    
    const paragraph = paragraphData.paragraphs[currentParagraphIndex];
    
    // 确保句子数>2时，至少有2个句群选项
    const sentenceCount = paragraph.sentences.length;
    if (sentenceCount > 2 && paragraph.sections.length < 2) {
        console.log(`⚠️ 句子数(${sentenceCount})>2，但句群数(${paragraph.sections.length})<2，自动补充句群`);
        
        // 如果只有1个句群，拆分为2个
        if (paragraph.sections.length === 1) {
            const originalSection = paragraph.sections[0];
            const midPoint = Math.floor(sentenceCount / 2);
            
            paragraph.sections = [
                {
                    sentenceIndexes: Array.from({length: midPoint}, (_, i) => i),
                    role: "前半部分",
                    description: "段落前半部分内容",
                    summary: originalSection.summary || "前半部分概要"
                },
                {
                    sentenceIndexes: Array.from({length: sentenceCount - midPoint}, (_, i) => i + midPoint),
                    role: "后半部分",
                    description: "段落后半部分内容",
                    summary: originalSection.summary || "后半部分概要"
                }
            ];
        }
        // 如果没有句群，创建2个默认句群
        else if (paragraph.sections.length === 0) {
            const midPoint = Math.floor(sentenceCount / 2);
            paragraph.sections = [
                {
                    sentenceIndexes: Array.from({length: midPoint}, (_, i) => i),
                    role: "前半部分",
                    description: "段落前半部分内容",
                    summary: "前半部分概要"
                },
                {
                    sentenceIndexes: Array.from({length: sentenceCount - midPoint}, (_, i) => i + midPoint),
                    role: "后半部分",
                    description: "段落后半部分内容",
                    summary: "后半部分概要"
                }
            ];
        }
    }
    
    // 翻译生词并更新悬浮生词本
    if (selectedWords.length > 0) {
        showLoading('正在翻译生词...');
        
        // 强制重建loadingMessage（如果需要）
        let checkOverlay = document.getElementById('loadingOverlay');
        let checkMessage = document.getElementById('loadingMessage');
        if (checkOverlay && !checkMessage) {
            checkOverlay.innerHTML = `<div id="loadingMessage"></div>`;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        showSentenceAnimation([]); // 显示学习提示动画
        const translations = await translateSelectedWords();
        hideSentenceAnimation();
        hideLoading();
        paragraphVocabulary.push(...translations);
        updateFloatingVocab();
    }
    
    // 左侧：句子列表，每句下方有单选句群按钮
    const sentenceList = document.getElementById('sentenceAnalysisList');
    sentenceList.innerHTML = paragraph.sentences.map((sentence, idx) => `
        <div class="sentence-analysis-item" data-sentence-index="${idx}" style="margin-bottom: 15px; padding: 15px; background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1); border-left: 4px solid #667eea;">
            <div style="font-size: 15px; color: #333; line-height: 1.8; margin-bottom: 8px;">${sentence.english}</div>
            <div style="font-size: 13px; color: #999; margin-bottom: 12px;">${sentence.chinese}</div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 12px; color: #999;">选择句群：</span>
                <div class="section-connection" data-sentence-index="${idx}" style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${paragraph.sections.map((section, sIdx) => `
                        <button class="section-btn" data-sentence-index="${idx}" data-section-index="${sIdx}" onclick="selectSectionConnection(${idx}, ${sIdx})" style="padding: 8px 15px; background: white; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; font-size: 12px; transition: all 0.3s; font-weight: 500;">
                            ${section.role}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('');
    
    // 右侧：句群概要
    const sectionList = document.getElementById('sectionSummaryList');
    sectionList.innerHTML = paragraph.sections.map((section, idx) => `
        <div class="section-summary-item" data-section-index="${idx}" style="margin-bottom: 15px; padding: 15px; background: #f8f9ff; border-radius: 10px; border-left: 4px solid #764ba2; box-shadow: 0 2px 6px rgba(118, 75, 162, 0.1);">
            <div style="font-weight: 600; color: #764ba2; font-size: 14px; margin-bottom: 8px;">📌 ${section.role}</div>
            <div style="font-size: 12px; color: #666; line-height: 1.6;">${section.summary || section.description}</div>
        </div>
    `).join('');
}

// 翻译选中的生词
async function translateSelectedWords() {
    const apiKey = localStorage.getItem('apiKey') || 'sk-be5a76fb81e844e0984fac68638bc69c';
    
    // 去重：过滤掉已存在于生词本中的单词
    const existingWords = new Set(paragraphVocabulary.map(v => v.word.toLowerCase()));
    const uniqueWords = selectedWords.filter(w => !existingWords.has(w.word.toLowerCase()));
    
    if (uniqueWords.length === 0) {
        console.log('⚠️ 所有选中的词都已在生词本中');
        return [];
    }
    
    const words = uniqueWords.map(w => w.word).join(', ');
    
    const prompt = `请翻译以下英语单词或词组，返回JSON格式：
${words}

返回格式：
{
    "translations": [
        {
            "word": "单词或词组",
            "partOfSpeech": "词性（如：n. v. adj. adv. 等，词组则为空字符串）",
            "phonetic": "音标（如：/wɜːrd/，词组则为空字符串）",
            "meaning": "中文释义"
        }
    ]
}

注意：
1. 如果是单个单词，必须提供词性和音标
2. 如果是词组（包含空格），词性和音标留空
3. 音标使用国际音标格式，用斜杠包围`;
    
    // 使用阿里云API代理
    const responseObj = await callAliAPI(
        '/aigc/text-generation/generation',
        {
            model: 'qwen-max',
            input: {
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            },
            parameters: {
                result_format: 'message'
            }
        },
        apiKey
    );
    
    const response = await responseObj.json();
    const content = response.output.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jsonMatch[0]);
    
    return result.translations;
}

// 设置结构分析拖拽
function setupStructureDragAndDrop() {
    const draggables = document.querySelectorAll('.draggable-sentence-group');
    const dropZones = document.querySelectorAll('.section-drop-zone');
    
    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', draggable.dataset.sectionIndex);
            draggable.classList.add('dragging');
        });
        
        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging');
        });
    });
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });
        
        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            
            const sectionIndex = e.dataTransfer.getData('text/plain');
            const draggable = document.querySelector(`.draggable-sentence-group[data-section-index="${sectionIndex}"]`);
            
            if (zone.children.length > 0) {
                const existing = zone.children[0];
                document.getElementById('paragraphSentenceOptions').appendChild(existing);
            }
            
            // 清空zone内容（包括提示文字）
            zone.innerHTML = '';
            zone.appendChild(draggable);
        });
    });
}

// 新的拖拽设置
function setupNewStructureDragAndDrop() {
    const draggables = document.querySelectorAll('.draggable-summary');
    const dropZones = document.querySelectorAll('.summary-drop-zone');
    
    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', draggable.dataset.sentenceIndex);
            draggable.style.opacity = '0.5';
        });
        
        draggable.addEventListener('dragend', () => {
            draggable.style.opacity = '1';
        });
    });
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.style.borderColor = '#667eea';
            zone.style.background = '#e8f0fe';
        });
        
        zone.addEventListener('dragleave', () => {
            zone.style.borderColor = '#667eea';
            zone.style.background = '#f8f9ff';
        });
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.style.borderColor = '#667eea';
            zone.style.background = '#f8f9ff';
            
            const sentenceIndex = e.dataTransfer.getData('text/plain');
            const draggable = document.querySelector(`.draggable-summary[data-sentence-index="${sentenceIndex}"]`);
            
            if (draggable) {
                // 如果zone已有内容，将其放回选项区
                if (zone.children.length > 0) {
                    const existing = zone.children[0];
                    document.getElementById('sentenceSummaryOptions').appendChild(existing);
                }
                
                // 清空zone并添加新的draggable
                zone.innerHTML = '';
                zone.appendChild(draggable.cloneNode(true));
                draggable.remove();
            }
        });
    });
}

// 句子与句群的连线（单选模式）
const sentenceToSectionMap = {};

function selectSectionConnection(sentenceIdx, sectionIdx) {
    // 获取该句子的所有按钮
    const allBtns = document.querySelectorAll(`.section-btn[data-sentence-index="${sentenceIdx}"]`);
    
    // 清除该句子的所有选择
    allBtns.forEach(btn => {
        btn.style.background = 'white';
        btn.style.borderColor = '#ddd';
        btn.style.color = '#666';
    });
    
    // 选中当前按钮
    const currentBtn = document.querySelector(`.section-btn[data-sentence-index="${sentenceIdx}"][data-section-index="${sectionIdx}"]`);
    currentBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    currentBtn.style.borderColor = '#667eea';
    currentBtn.style.color = 'white';
    
    // 更新映射（单选，直接赋值）
    sentenceToSectionMap[sentenceIdx] = sectionIdx;
}

// 检查结构分析答案（简化版：只检查句群连线）
async function checkStructureAnswers() {
    const paragraph = paragraphData.paragraphs[currentParagraphIndex];
    let allCorrect = true;
    const errors = [];
    
    // 检查句子与句群的连线
    paragraph.sentences.forEach((sentence, sIdx) => {
        // 找出该句子应该属于哪个section
        const correctSection = paragraph.sections.findIndex(section => 
            section.sentenceIndexes.includes(sIdx)
        );
        
        const userSelection = sentenceToSectionMap[sIdx];
        
        if (userSelection === undefined) {
            allCorrect = false;
            errors.push(`句子${sIdx + 1}未选择句群`);
            // 给句子卡片添加红色边框
            const sentenceCard = document.querySelector(`.sentence-analysis-item[data-sentence-index="${sIdx}"]`);
            if (sentenceCard) {
                sentenceCard.style.borderLeft = '4px solid #f44336';
                sentenceCard.style.background = '#ffebee';
            }
        } else if (userSelection !== correctSection) {
            allCorrect = false;
            errors.push(`句子${sIdx + 1}选择的句群错误`);
            // 给句子卡片添加红色边框
            const sentenceCard = document.querySelector(`.sentence-analysis-item[data-sentence-index="${sIdx}"]`);
            if (sentenceCard) {
                sentenceCard.style.borderLeft = '4px solid #f44336';
                sentenceCard.style.background = '#ffebee';
            }
        } else {
            // 正确，添加绿色边框
            const sentenceCard = document.querySelector(`.sentence-analysis-item[data-sentence-index="${sIdx}"]`);
            if (sentenceCard) {
                sentenceCard.style.borderLeft = '4px solid #4caf50';
                sentenceCard.style.background = '#e8f5e9';
            }
        }
    });
    
    if (allCorrect) {
        showEncouragement();
        setTimeout(() => {
            // 清除边框颜色
            const allCards = document.querySelectorAll('.sentence-analysis-item');
            allCards.forEach(card => {
                card.style.borderLeft = '4px solid #667eea';
                card.style.background = 'white';
            });
            
            // 隐藏检查答案按钮，显示下一步按钮
            const checkBtn = document.querySelector('#paragraphStructurePanel .btn-check');
            const nextBtn = document.getElementById('structureNextBtn');
            checkBtn.style.display = 'none';
            nextBtn.style.display = 'inline-block';
        }, 1500);
    } else {
        await showWarning(`有 ${errors.length} 处错误：\n${errors.join('\n')}`, '答题提示');
        setTimeout(() => {
            const allCards = document.querySelectorAll('.sentence-analysis-item');
            allCards.forEach(card => {
                card.style.borderLeft = '4px solid #667eea';
                card.style.background = 'white';
            });
        }, 3000);
    }
}

// 旧版本的检查函数（保留以防需要）
async function checkStructureAnswersOld() {
    const dropZones = document.querySelectorAll('.section-drop-zone');
    let allCorrect = true;
    const errors = [];
    
    dropZones.forEach((zone, index) => {
        const draggable = zone.querySelector('.draggable-sentence-group');
        if (!draggable) {
            allCorrect = false;
            errors.push(index + 1);
            // 红色边框
            zone.style.border = '2px solid #f44336';
            zone.style.background = '#ffebee';
            return;
        }
        
        const sectionIndex = parseInt(draggable.dataset.sectionIndex);
        if (sectionIndex !== index) {
            allCorrect = false;
            errors.push(index + 1);
            // 红色边框
            zone.style.border = '2px solid #f44336';
            zone.style.background = '#ffebee';
        } else {
            // 绿色边框
            zone.style.border = '2px solid #4caf50';
            zone.style.background = '#e8f5e9';
        }
    });
    
    if (allCorrect) {
        showEncouragement();
        setTimeout(() => {
            // 隐藏检查答案按钮，显示下一步按钮
            const checkBtn = document.querySelector('#paragraphStructurePanel .btn-check');
            const nextBtn = document.getElementById('structureNextBtn');
            checkBtn.style.display = 'none';
            nextBtn.style.display = 'inline-block';
        }, 1500);
    } else {
        await showWarning(`有 ${errors.length} 处错误（位置：${errors.join(', ')}），请查看红色标记`, '答题提示');
        setTimeout(() => {
            document.querySelectorAll('.section-drop-zone').forEach(zone => {
                // 恢复原样式
                zone.style.border = '2px dashed #667eea';
                zone.style.background = 'white';
            });
        }, 3000);
    }
}

// 下一步：段落自查（继续当前段落）
function nextToParagraphReview() {
    document.getElementById('paragraphStructurePanel').style.display = 'none';
    document.getElementById('paragraphReviewPanel').style.display = 'block';
    
    showParagraphReviewPanel();
}

// 显示段落自查面板（单句排序）
function showParagraphReviewPanel() {
    // 重置按钮状态
    const checkBtn = document.querySelector('#paragraphReviewPanel .btn-check');
    const nextBtn = document.getElementById('reviewNextBtn');
    checkBtn.style.display = 'inline-block';
    checkBtn.textContent = '检查答案';
    checkBtn.onclick = checkReviewAnswers;
    nextBtn.style.display = 'none';
    
    // 更新进度条
    updateParagraphProgress('Review');
    
    const paragraph = paragraphData.paragraphs[currentParagraphIndex];
    
    // 创建句子卡片
    const sentenceCards = paragraph.sentences.map((sent, i) => ({
        originalIndex: i,
        english: sent.english
    }));
    
    const shuffled = shuffleArray(sentenceCards);
    
    const panel = document.getElementById('paragraphReviewSentences');
    panel.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px; border-radius: 10px; margin-bottom: 20px; color: white; text-align: center;">
                <div style="font-size: 16px; font-weight: 600;">📝 拖拽句子重新排序</div>
                <div style="font-size: 13px; margin-top: 5px; opacity: 0.9;">将句子拖拽到正确的位置，恢复段落的逻辑顺序</div>
            </div>
            ${shuffled.map((sent, i) => `
                <div class="review-sentence-card" draggable="true" data-original-index="${sent.originalIndex}" data-current-index="${i}" 
                     style="margin-bottom: 15px; padding: 18px; background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: move; transition: all 0.3s; border-left: 4px solid #667eea;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="flex-shrink: 0; width: 36px; height: 36px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 15px;">
                            ${i + 1}
                        </div>
                        <div style="flex: 1; font-size: 15px; line-height: 1.8; color: #333;">
                            ${sent.english}
                        </div>
                        <div style="flex-shrink: 0; color: #999; font-size: 20px;">
                            ⋮⋮
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    setupReviewDragAndDrop();
}

// 设置段落自查拖拽（适配单句卡片）
function setupReviewDragAndDrop() {
    const cards = document.querySelectorAll('.review-sentence-card');
    
    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.dataset.currentIndex);
            card.style.opacity = '0.5';
            card.style.transform = 'scale(0.95)';
        });
        
        card.addEventListener('dragend', () => {
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
        });
        
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            card.style.borderLeft = '4px solid #f093fb';
            card.style.background = '#f8f9ff';
        });
        
        card.addEventListener('dragleave', () => {
            card.style.borderLeft = '4px solid #667eea';
            card.style.background = 'white';
        });
        
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.style.borderLeft = '4px solid #667eea';
            card.style.background = 'white';
            
            const draggedIndex = e.dataTransfer.getData('text/plain');
            const draggedCard = document.querySelector(`.review-sentence-card[data-current-index="${draggedIndex}"]`);
            const targetCard = e.currentTarget;
            
            if (!draggedCard || draggedCard === targetCard) return;
            
            // 交换位置
            const panel = document.getElementById('paragraphReviewSentences');
            const container = panel.querySelector('div[style*="max-width"]');
            const allCards = Array.from(container.querySelectorAll('.review-sentence-card'));
            const draggedPos = allCards.indexOf(draggedCard);
            const targetPos = allCards.indexOf(targetCard);
            
            if (draggedPos < targetPos) {
                targetCard.after(draggedCard);
            } else {
                targetCard.before(draggedCard);
            }
            
            // 更新序号
            updateReviewOrder();
        });
    });
}

// 更新段落自查序号（适配句群卡片）
function updateReviewOrder() {
    const panel = document.getElementById('paragraphReviewSentences');
    const container = panel.querySelector('div[style*="max-width"]');
    const cards = container.querySelectorAll('.review-sentence-card');
    
    cards.forEach((card, i) => {
        card.dataset.currentIndex = i;
        // 更新圆形序号
        const orderCircle = card.querySelector('div[style*="border-radius: 50%"]');
        if (orderCircle) {
            orderCircle.textContent = i + 1;
        }
    });
}

// 检查段落自查答案（适配单句排序）
async function checkReviewAnswers() {
    const cards = document.querySelectorAll('.review-sentence-card');
    let allCorrect = true;
    const errors = [];
    
    cards.forEach((card, index) => {
        const originalIndex = parseInt(card.dataset.originalIndex);
        if (originalIndex !== index) {
            allCorrect = false;
            errors.push(index + 1); // 记录错误位置（1-indexed）
            // 红色边框
            card.style.borderLeft = '4px solid #f44336';
            card.style.background = '#ffebee';
        } else {
            // 绿色边框
            card.style.borderLeft = '4px solid #4caf50';
            card.style.background = '#e8f5e9';
        }
    });
    
    if (allCorrect) {
        showEncouragement();
        setTimeout(() => {
            const totalParagraphs = paragraphData.paragraphs.length;
            const checkBtn = document.querySelector('#paragraphReviewPanel .btn-check');
            const nextBtn = document.getElementById('reviewNextBtn');
            
            if (currentParagraphIndex < totalParagraphs - 1) {
                // 还有下一段，返回步骤二学习下一段
                checkBtn.textContent = '下一段';
                // 改为紫色背景（与其他按钮一致）
                checkBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                checkBtn.onclick = () => {
                    currentParagraphIndex++;
                    checkBtn.textContent = '检查答案';
                    // 恢复粉色背景
                    checkBtn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
                    checkBtn.onclick = checkReviewAnswers;
                    // 返回步骤二，学习下一段
                    document.getElementById('paragraphReviewPanel').style.display = 'none';
                    document.getElementById('paragraphMeaningPanel').style.display = 'block';
                    showSentenceMeaningPanel();
                };
            } else {
                // 最后一段，显示"进入复习"按钮
                checkBtn.style.display = 'none';
                nextBtn.textContent = '进入复习';
                nextBtn.style.display = 'block';
            }
        }, 1500);
    } else {
        await showWarning(`有 ${errors.length} 处顺序错误（位置：${errors.join(', ')}），请查看红色标记`, '答题提示');
        setTimeout(() => {
            cards.forEach(card => {
                // 恢复原样式
                card.style.borderLeft = '4px solid #667eea';
                card.style.background = 'white';
            });
        }, 3000);
    }
}

// 步骤四完成，进入下一段或步骤五
function nextParagraphOrFinish() {
    currentParagraphIndex++;
    
    if (currentParagraphIndex < paragraphData.paragraphs.length) {
        // 还有下一段，重新开始步骤二
        selectedWords = [];
        document.getElementById('paragraphReviewPanel').style.display = 'none';
        document.getElementById('paragraphMeaningPanel').style.display = 'block';
        showSentenceMeaningPanel();
    } else {
        // 所有段落完成，进入步骤五（段落总结）
        document.getElementById('paragraphReviewPanel').style.display = 'none';
        document.getElementById('paragraphSummaryPanel').style.display = 'block';
        showSummaryPanel();
    }
}

// 显示步骤六：段落理解（所有段落完成后）
async function showComprehensionPanel() {
    // 显示loading
    showLoading('AI正在生成理解题目...');
    
    // 强制重建loadingMessage
    let checkOverlay = document.getElementById('loadingOverlay');
    let checkMessage = document.getElementById('loadingMessage');
    if (checkOverlay && !checkMessage) {
        checkOverlay.innerHTML = `<div id="loadingMessage"></div>`;
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    showSentenceAnimation([]);
    
    try {
        // 为所有段落生成理解题目（根据段落长度成比例出题）
        const allQuestions = [];
        for (let i = 0; i < paragraphData.paragraphs.length; i++) {
            const paragraph = paragraphData.paragraphs[i];
            const sentenceCount = paragraph.sentences.length;
            
            // 优化出题数量算法：
            // - 2句及以下：1题
            // - 3-5句：2题
            // - 6-8句：3题
            // - 9-11句：4题
            // - 12句及以上：5题
            let questionCount;
            if (sentenceCount <= 2) {
                questionCount = 1;
            } else if (sentenceCount <= 5) {
                questionCount = 2;
            } else if (sentenceCount <= 8) {
                questionCount = 3;
            } else if (sentenceCount <= 11) {
                questionCount = 4;
            } else {
                questionCount = 5;
            }
            
            console.log(`段落${i + 1}: ${sentenceCount}句 → 生成${questionCount}题`);
            
            const questions = await generateComprehensionQuestions(paragraph, questionCount, i);
            allQuestions.push(...questions.map(q => ({ ...q, paragraphIndex: i })));
        }
        
        hideSentenceAnimation();
        hideLoading();
        
        // 显示题目（左侧全文，右侧题目）
        displayComprehensionQuestions(allQuestions);
        
        // 保存到全局变量
        window.currentComprehensionQuestions = allQuestions;
    } catch (error) {
        hideSentenceAnimation();
        hideLoading();
        await showError('生成题目失败，请重试', '生成失败');
        console.error(error);
    }
}

// AI生成理解题目
async function generateComprehensionQuestions(paragraph, questionCount, paragraphIndex) {
    const apiKey = localStorage.getItem('apiKey') || 'sk-be5a76fb81e844e0984fac68638bc69c';
    
    const paragraphText = paragraph.sentences.map(s => s.english).join(' ');
    
    const prompt = `Based on the following English paragraph, generate ${questionCount} TOEFL-style reading comprehension multiple-choice questions.

Paragraph:
${paragraphText}

Requirements:
1. Question types include:
   - Vocabulary questions (word meaning in context)
   - Detail questions (factual information)
   - Inference questions (implied information)
   - Sentence simplification questions (paraphrasing)
   - Rhetorical purpose questions (author's intent)
2. Each question has 4 options
3. Options should be challenging with common misconceptions
4. Difficulty level should match TOEFL reading standards
5. **IMPORTANT: All questions and options MUST be in English only. Do NOT use Chinese.**

Return JSON format:
{
    "questions": [
        {
            "question": "Question text in English",
            "options": ["Option A in English", "Option B in English", "Option C in English", "Option D in English"],
            "correctAnswer": 0,
            "explanation": "Explanation in English"
        }
    ]
}`;

    const responseObj = await callAliAPI(
        '/aigc/text-generation/generation',
        {
            model: 'qwen-max',
            input: {
                messages: [{ role: 'user', content: prompt }]
            },
            parameters: {
                result_format: 'message'
            }
        },
        apiKey
    );
    
    const response = await responseObj.json();
    const content = response.output.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jsonMatch[0]);
    
    // 清理选项文本，移除可能的字母前缀（如"A. "、"B. "等）
    result.questions.forEach(q => {
        q.options = q.options.map(opt => {
            // 移除开头的字母标签（A. B. C. D. 或 A) B) C) D)）
            return opt.replace(/^[A-D][\.\)]\s*/, '').trim();
        });
    });
    
    return result.questions;
}

// 显示理解题目（左侧全文，右侧题目）
function displayComprehensionQuestions(questions) {
    const container = document.getElementById('comprehensionQuestions');
    
    // 准备全文内容
    const fullText = paragraphData.paragraphs.map((p, idx) => ({
        index: idx,
        text: p.sentences.map(s => s.english).join(' ')
    }));
    
    container.innerHTML = `
        <div style="max-width: 1400px; margin: 0 auto;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <!-- 左侧：全文 -->
                <div>
                    <h3 style="color: #667eea; margin-bottom: 20px; font-size: 16px; font-weight: 600;">📄 文章全文</h3>
                    <div style="padding: 25px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-left: 4px solid #667eea; max-height: 700px; overflow-y: auto;">
                        ${fullText.map(p => `
                            <div id="paragraph_${p.index}" style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px dashed #e0e0e0;">
                                <div style="font-weight: 600; color: #667eea; margin-bottom: 12px; font-size: 14px;">段落 ${p.index + 1}</div>
                                <div style="font-size: 15px; color: #333; line-height: 2; text-align: justify;">
                                    ${p.text}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- 右侧：题目 -->
                <div>
                    <h3 style="color: #764ba2; margin-bottom: 20px; font-size: 16px; font-weight: 600;">🧠 理解题目</h3>
                    <div style="max-height: 700px; overflow-y: auto; padding-right: 10px;">
                        ${questions.map((q, qIdx) => `
                            <div class="comprehension-question" data-question-index="${qIdx}" data-paragraph-index="${q.paragraphIndex}" style="margin-bottom: 25px; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-left: 4px solid #667eea;">
                                <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 15px; line-height: 1.8;">
                                    <span style="display: inline-block; padding: 4px 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 20px; font-size: 12px; margin-right: 8px;">段落 ${q.paragraphIndex + 1}</span>
                                    <span style="display: inline-block; width: 28px; height: 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; text-align: center; line-height: 28px; margin-right: 8px; font-size: 13px;">${qIdx + 1}</span>
                                    ${q.question}
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 10px;">
                                    ${q.options.map((opt, optIdx) => `
                                        <label class="comprehension-option" style="display: flex; align-items: flex-start; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: all 0.3s; background: #fafafa;">
                                            <input type="radio" name="question_${qIdx}" value="${optIdx}" style="margin-top: 3px; margin-right: 10px; width: 16px; height: 16px; cursor: pointer;">
                                            <span style="flex: 1; font-size: 14px; line-height: 1.6; color: #333;">
                                                <strong style="color: #667eea;">${String.fromCharCode(65 + optIdx)}.</strong> ${opt}
                                            </span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 添加选项点击效果
    container.querySelectorAll('.comprehension-option').forEach(label => {
        label.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            const questionDiv = this.closest('.comprehension-question');
            const allOptions = questionDiv.querySelectorAll('.comprehension-option');
            
            allOptions.forEach(opt => {
                opt.style.border = '2px solid #e0e0e0';
                opt.style.background = '#fafafa';
            });
            
            this.style.border = '2px solid #667eea';
            this.style.background = '#f8f9ff';
        });
    });
    
    // 添加题目点击高亮对应段落的功能
    container.querySelectorAll('.comprehension-question').forEach(questionDiv => {
        questionDiv.addEventListener('mouseenter', function() {
            const paragraphIndex = this.dataset.paragraphIndex;
            const paragraphElement = document.getElementById(`paragraph_${paragraphIndex}`);
            if (paragraphElement) {
                paragraphElement.style.background = '#f8f9ff';
                paragraphElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
        
        questionDiv.addEventListener('mouseleave', function() {
            const paragraphIndex = this.dataset.paragraphIndex;
            const paragraphElement = document.getElementById(`paragraph_${paragraphIndex}`);
            if (paragraphElement) {
                paragraphElement.style.background = 'transparent';
            }
        });
    });
}

// 检查理解题答案
async function checkComprehensionAnswers() {
    const questions = window.currentComprehensionQuestions;
    let allCorrect = true;
    const errors = [];
    
    questions.forEach((q, qIdx) => {
        const selectedOption = document.querySelector(`input[name="question_${qIdx}"]:checked`);
        const questionDiv = document.querySelector(`.comprehension-question[data-question-index="${qIdx}"]`);
        const allOptions = questionDiv.querySelectorAll('.comprehension-option');
        
        if (!selectedOption) {
            allCorrect = false;
            errors.push(qIdx + 1);
            questionDiv.style.borderLeft = '4px solid #f44336';
            return;
        }
        
        const selectedAnswer = parseInt(selectedOption.value);
        const correctAnswer = q.correctAnswer;
        
        if (selectedAnswer !== correctAnswer) {
            allCorrect = false;
            errors.push(qIdx + 1);
            
            // 标记错误选项
            allOptions[selectedAnswer].style.border = '2px solid #f44336';
            allOptions[selectedAnswer].style.background = '#ffebee';
            
            // 标记正确选项
            allOptions[correctAnswer].style.border = '2px solid #4caf50';
            allOptions[correctAnswer].style.background = '#e8f5e9';
            
            questionDiv.style.borderLeft = '4px solid #f44336';
        } else {
            // 全部标记为正确
            allOptions[correctAnswer].style.border = '2px solid #4caf50';
            allOptions[correctAnswer].style.background = '#e8f5e9';
            questionDiv.style.borderLeft = '4px solid #4caf50';
        }
    });
    
    if (allCorrect) {
        showEncouragement();
        setTimeout(() => {
            const checkBtn = document.querySelector('#paragraphComprehensionPanel .btn-check');
            const nextBtn = document.getElementById('comprehensionNextBtn');
            checkBtn.style.display = 'none';
            nextBtn.style.display = 'inline-block';
        }, 1500);
    } else {
        await showWarning(`有 ${errors.length} 题答错，请查看标记并重新作答`, '答题提示');
        setTimeout(() => {
            document.querySelectorAll('.comprehension-question').forEach(q => {
                q.style.borderLeft = '4px solid #667eea';
            });
            document.querySelectorAll('.comprehension-option').forEach(opt => {
                if (!opt.querySelector('input:checked')) {
                    opt.style.border = '2px solid #e0e0e0';
                    opt.style.background = '#fafafa';
                }
            });
        }, 3000);
    }
}

// 步骤五完成，进入下一段或步骤六
function nextToSummaryOrNextParagraph() {
    currentParagraphIndex++;
    
    if (currentParagraphIndex < paragraphData.paragraphs.length) {
        // 还有下一段，重新开始步骤二
        selectedWords = [];
        document.getElementById('paragraphComprehensionPanel').style.display = 'none';
        document.getElementById('paragraphMeaningPanel').style.display = 'block';
        showSentenceMeaningPanel();
    } else {
        // 所有段落完成，进入步骤六
        document.getElementById('paragraphComprehensionPanel').style.display = 'none';
        document.getElementById('paragraphSummaryPanel').style.display = 'block';
        showSummaryPanel();
    }
}

// 显示步骤五：段落总结（所有段落完成后）
function showSummaryPanel() {
    const container = document.getElementById('summaryMatching');
    
    // 准备所有段落的信息
    const paragraphs = paragraphData.paragraphs.map((p, idx) => ({
        index: idx,
        fullText: p.sentences.map(s => s.english).join(' '),
        keywords: p.sections.map(s => s.role).join('、'),
        summary: p.sections.map(s => s.summary || s.description).join('；')
    }));
    
    // 打乱总结顺序
    const shuffledSummaries = shuffleArray([...paragraphs]);
    
    container.innerHTML = `
        <div style="max-width: 1400px; margin: 0 auto;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <!-- 左侧：所有段落全文 -->
                <div>
                    <h3 style="color: #667eea; margin-bottom: 20px; font-size: 16px; font-weight: 600;">📄 段落全文</h3>
                    <div style="max-height: 700px; overflow-y: auto; padding-right: 10px;">
                        ${paragraphs.map((p, idx) => `
                            <div class="paragraph-item" data-paragraph-index="${idx}" style="margin-bottom: 20px; padding: 25px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-left: 4px solid #667eea;">
                                <div style="font-weight: 600; color: #667eea; margin-bottom: 15px; font-size: 15px;">段落 ${idx + 1}</div>
                                <div style="font-size: 14px; color: #333; line-height: 2; text-align: justify; margin-bottom: 15px;">
                                    ${p.fullText}
                                </div>
                                <div class="summary-drop-zone" data-target="${idx}" style="min-height: 100px; border: 2px dashed #667eea; border-radius: 8px; padding: 15px; background: #f8f9ff; text-align: center; color: #999; font-size: 13px;">
                                    拖拽右侧段落大意到这里
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- 右侧：段落大意（打乱顺序） -->
                <div>
                    <h3 style="color: #764ba2; margin-bottom: 20px; font-size: 16px; font-weight: 600;">📝 段落大意</h3>
                    <div id="summaryOptions" style="max-height: 700px; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column; gap: 15px;">
                        ${shuffledSummaries.map(p => `
                            <div class="draggable-summary" draggable="true" data-original-index="${p.index}" style="padding: 20px; background: white; border-radius: 10px; cursor: move; border: 2px solid #764ba2; box-shadow: 0 2px 8px rgba(118, 75, 162, 0.1); transition: all 0.3s;">
                                <div style="font-weight: 600; color: #764ba2; margin-bottom: 10px; font-size: 14px;">🔑 关键词</div>
                                <div style="font-size: 13px; color: #555; line-height: 1.6; margin-bottom: 12px; padding: 10px; background: #f8f9ff; border-radius: 6px;">
                                    ${p.keywords}
                                </div>
                                <div style="font-weight: 600; color: #764ba2; margin-bottom: 10px; font-size: 14px;">📋 段落大意</div>
                                <div style="font-size: 13px; color: #333; line-height: 1.8;">
                                    ${p.summary}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    setupSummaryDragAndDrop();
}

// 设置总结匹配拖拽
function setupSummaryDragAndDrop() {
    const draggables = document.querySelectorAll('.draggable-summary');
    const dropZones = document.querySelectorAll('.summary-drop-zone');
    
    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', draggable.dataset.originalIndex);
            draggable.style.opacity = '0.5';
        });
        
        draggable.addEventListener('dragend', () => {
            draggable.style.opacity = '1';
        });
    });
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.style.background = '#e8f5e9';
        });
        
        zone.addEventListener('dragleave', () => {
            zone.style.background = '#f8f9ff';
        });
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.style.background = '#f8f9ff';
            
            const originalIndex = e.dataTransfer.getData('text/plain');
            const draggable = document.querySelector(`.draggable-summary[data-original-index="${originalIndex}"]`);
            
            // 如果已有内容，放回选项区
            if (zone.children.length > 0) {
                const existing = zone.children[0];
                document.getElementById('summaryOptions').appendChild(existing);
            }
            
            zone.innerHTML = '';
            zone.appendChild(draggable);
        });
    });
}

// 检查步骤五的匹配答案
async function checkSummaryAnswers() {
    const dropZones = document.querySelectorAll('.summary-drop-zone');
    let allCorrect = true;
    const errors = [];
    
    dropZones.forEach((zone, index) => {
        const draggable = zone.querySelector('.draggable-summary');
        const paragraphItem = zone.closest('.paragraph-item');
        
        if (!draggable) {
            allCorrect = false;
            errors.push(index + 1);
            paragraphItem.style.borderLeft = '4px solid #f44336';
            zone.style.border = '2px dashed #f44336';
            return;
        }
        
        const originalIndex = parseInt(draggable.dataset.originalIndex);
        if (originalIndex !== index) {
            allCorrect = false;
            errors.push(index + 1);
            paragraphItem.style.borderLeft = '4px solid #f44336';
            draggable.style.border = '2px solid #f44336';
            draggable.style.background = '#ffebee';
        } else {
            paragraphItem.style.borderLeft = '4px solid #4caf50';
            draggable.style.border = '2px solid #4caf50';
            draggable.style.background = '#e8f5e9';
        }
    });
    
    if (allCorrect) {
        showEncouragement();
        setTimeout(() => {
            const checkBtn = document.querySelector('#paragraphSummaryPanel .btn-check');
            const nextBtn = document.getElementById('summaryNextBtn');
            checkBtn.style.display = 'none';
            nextBtn.style.display = 'inline-block';
        }, 1500);
    } else {
        await showWarning(`有 ${errors.length} 处错误，请查看标记并重新匹配`, '答题提示');
        setTimeout(() => {
            document.querySelectorAll('.paragraph-item').forEach(item => {
                item.style.borderLeft = '4px solid #667eea';
            });
            document.querySelectorAll('.draggable-summary').forEach(sum => {
                sum.style.border = '2px solid #764ba2';
                sum.style.background = 'white';
            });
            document.querySelectorAll('.summary-drop-zone').forEach(zone => {
                zone.style.border = '2px dashed #667eea';
            });
        }, 3000);
    }
}

// 步骤五完成，进入步骤六
function nextToComprehensionOrNextParagraph() {
    // 步骤五完成后，进入步骤六
    document.getElementById('paragraphSummaryPanel').style.display = 'none';
    document.getElementById('paragraphComprehensionPanel').style.display = 'block';
    showComprehensionPanel();
}

// 完成所有学习
function finishParagraphLearning() {
    document.getElementById('paragraphComprehensionPanel').style.display = 'none';
    showParagraphCompletionPanel();
}

// 显示完成页面
function showParagraphCompletionPanel() {
    // 隐藏所有其他面板
    document.querySelectorAll('.panel').forEach(panel => {
        panel.style.display = 'none';
    });
    
    document.getElementById('paragraphCompletionPanel').style.display = 'block';
    
    // 隐藏悬浮生词本球（因为生词已在页面上显示）
    document.getElementById('floatingVocabBall').style.display = 'none';
    
    // 统计
    const totalSentences = paragraphData.paragraphs.reduce((sum, p) => sum + p.sentences.length, 0);
    document.getElementById('totalParagraphsLearned').textContent = paragraphData.paragraphs.length;
    document.getElementById('totalVocabularyMastered').textContent = paragraphVocabulary.length;
    
    // 显示段落结构分析
    generateParagraphReview();
}

// 生成段落复习内容（按小节显示，与PDF格式一致）
function generateParagraphReview() {
    const reviewDiv = document.getElementById('paragraphReviewContent');
    const vocabDiv = document.getElementById('paragraphVocabularyReview');
    
    let html = '';
    paragraphData.paragraphs.forEach((p, pIndex) => {
        html += `<h3 style="color: #764ba2; font-size: 20px; font-weight: 600; margin-top: 20px;">第 ${pIndex + 1} 段</h3>`;
        p.sections.map(section => {
            html += `
                <div class="section" style="margin: 15px 0; padding: 15px; background: #f8f9ff; border-left: 4px solid #667eea; border-radius: 5px;">
                    <div class="role" style="font-weight: 700; color: #667eea; margin-bottom: 10px; font-size: 16px;">📌 ${section.role}</div>
                    ${section.sentenceIndexes.map(idx => `
                        <div class="sentence" style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                            <div class="sentence-en" style="font-size: 15px; color: #333; margin-bottom: 5px; line-height: 1.6;">${p.sentences[idx].english}</div>
                            <div class="sentence-cn" style="font-size: 14px; color: #666; line-height: 1.6;">${p.sentences[idx].chinese}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        });
    });
    
    reviewDiv.innerHTML = html;
    
    // 生成生词本（与悬浮球格式一致，包含音标和词性）
    if (paragraphVocabulary.length > 0) {
        vocabDiv.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto;">
                ${paragraphVocabulary.map((w, i) => {
                    const isPhrase = w.word.includes(' ');
                    return `
                        <div class="vocab-item" style="margin: 12px 0; padding: 15px; background: #f8f9ff; border-radius: 8px; border-left: 3px solid #667eea;">
                            <div style="display: flex; align-items: flex-start; gap: 15px;">
                                <span class="vocab-number" style="font-weight: 700; color: #667eea; font-size: 16px; min-width: 30px; padding-top: 2px;">${i + 1}.</span>
                                <div style="flex: 1;">
                                    <div style="font-weight: 700; color: #333; font-size: 16px; margin-bottom: 5px;">${w.word}</div>
                                    ${!isPhrase && w.phonetic ? `<div style="color: #667eea; font-size: 13px; margin-bottom: 3px; font-family: 'Lucida Sans Unicode', 'Arial Unicode MS';">${w.phonetic}</div>` : ''}
                                    ${!isPhrase && w.partOfSpeech ? `<div style="color: #999; font-size: 12px; margin-bottom: 5px;">${w.partOfSpeech}</div>` : ''}
                                    <div style="color: #666; font-size: 15px;">${w.meaning}</div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } else {
        vocabDiv.innerHTML = '<p style="color: #999; text-align: center;">未选择生词</p>';
    }
}

// 导出段落学习成果
async function exportParagraphLearning() {
    const format = await showFormatSelectionDialog();
    if (!format) {
        console.log('用户取消导出');
        return;
    }
    
    console.log(`开始导出${format === 'pdf' ? 'PDF' : 'Word'}文档...`);
    
    const htmlContent = generateParagraphExportHTML();
    const dateStr = new Date().toISOString().slice(0,10);
    const filename = format === 'pdf' 
        ? `段落学习成果_${dateStr}.pdf`
        : `段落学习成果_${dateStr}.doc`;
    
    const mimeType = format === 'pdf'
        ? 'application/pdf'
        : 'application/msword';
    
    // 检测是否在Electron环境中
    if (window.electronAPI) {
        // Electron环境：使用文件保存对话框
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
        // 浏览器环境：使用传统下载方式
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
            
            console.log('✅ 导出成功！');
            await showSuccess('导出成功！\n文件已保存到下载文件夹', '导出成功');
        }
    }
}

// 生成导出HTML
function generateParagraphExportHTML() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>段落学习成果</title>
    <style>
        body { 
            font-family: "Microsoft YaHei", Arial, sans-serif; 
            line-height: 1.8; 
            padding: 30px; 
            max-width: 900px; 
            margin: 0 auto;
            background: #f8f9fa;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { 
            text-align: center; 
            color: #667eea; 
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 30px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 15px;
        }
        h2 { 
            color: #667eea; 
            margin-top: 30px; 
            font-size: 24px;
            font-weight: 600;
            border-left: 5px solid #667eea;
            padding-left: 15px;
        }
        h3 {
            color: #764ba2;
            font-size: 20px;
            font-weight: 600;
            margin-top: 20px;
        }
        .summary {
            background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            border: 2px solid #667eea30;
        }
        .summary p {
            margin: 10px 0;
            font-size: 16px;
        }
        .summary strong {
            color: #667eea;
            font-weight: 700;
            font-size: 17px;
        }
        .section { 
            margin: 15px 0; 
            padding: 15px; 
            background: #f8f9ff; 
            border-left: 4px solid #667eea;
            border-radius: 5px;
        }
        .role { 
            font-weight: 700; 
            color: #667eea; 
            margin-bottom: 10px; 
            font-size: 16px;
        }
        .sentence { 
            margin: 10px 0; 
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .sentence:last-child {
            border-bottom: none;
        }
        .sentence-en {
            font-size: 15px;
            color: #333;
            margin-bottom: 5px;
            line-height: 1.6;
        }
        .sentence-cn {
            font-size: 14px;
            color: #666;
            line-height: 1.6;
        }
        .vocab-item { 
            margin: 12px 0; 
            padding: 12px 15px;
            background: #f8f9ff;
            border-radius: 8px;
            border-left: 3px solid #667eea;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .vocab-number {
            font-weight: 700;
            color: #667eea;
            font-size: 16px;
            min-width: 30px;
        }
        .vocab-word {
            font-weight: 700;
            color: #333;
            font-size: 16px;
            min-width: 120px;
        }
        .vocab-meaning {
            color: #666;
            font-size: 15px;
        }
        .footer {
            text-align: center; 
            margin-top: 50px; 
            padding-top: 20px;
            border-top: 2px solid #eee;
            color: #999;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>段落学习成果</h1>
        
        <div class="summary">
            <p><strong>📅 学习日期：</strong>${new Date().toLocaleString('zh-CN')}</p>
            <p><strong>📖 学习段落：</strong>${paragraphData.paragraphs.length} 段</p>
            <p><strong>📚 掌握单词：</strong>${paragraphVocabulary.length} 个</p>
        </div>
        
        <h2>📋 段落结构分析</h2>
        ${paragraphData.paragraphs.map((p, pIndex) => `
            <h3>第 ${pIndex + 1} 段</h3>
            ${p.sections.map(section => `
                <div class="section">
                    <div class="role">📌 ${section.role}</div>
                    ${section.sentenceIndexes.map(idx => `
                        <div class="sentence">
                            <div class="sentence-en">${p.sentences[idx].english}</div>
                            <div class="sentence-cn">${p.sentences[idx].chinese}</div>
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        `).join('')}
        
        ${paragraphVocabulary.length > 0 ? `
            <h2>📚 生词本</h2>
            ${paragraphVocabulary.map((w, i) => {
                const isPhrase = w.word.includes(' ');
                return `
                    <div class="vocab-item">
                        <span class="vocab-number">${i + 1}.</span>
                        <div style="flex: 1;">
                            ${isPhrase ? `
                                <!-- 词组格式：第一行词组，第二行释义 -->
                                <div class="vocab-word">${w.word}</div>
                                <div class="vocab-meaning">${w.meaning}</div>
                            ` : `
                                <!-- 单词格式：第一行单词+音标，第二行词性+释义 -->
                                <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px;">
                                    <span class="vocab-word" style="margin: 0;">${w.word}</span>
                                    ${w.phonetic ? `<span style="color: #667eea; font-size: 13px; font-family: 'Lucida Sans Unicode', 'Arial Unicode MS';">${w.phonetic}</span>` : ''}
                                </div>
                                <div style="display: flex; align-items: baseline; gap: 8px;">
                                    ${w.partOfSpeech ? `<span style="color: #999; font-size: 12px;">${w.partOfSpeech}</span>` : ''}
                                    <span class="vocab-meaning" style="margin: 0;">${w.meaning}</span>
                                </div>
                            `}
                        </div>
                    </div>
                `;
            }).join('')}
        ` : ''}
        
        <div class="footer">
            <p>✨ 睿叮AI英语学习助手 ✨</p>
            <p>生成于 ${new Date().toLocaleString('zh-CN')}</p>
        </div>
    </div>
</body>
</html>
    `;
}

// 悬浮生词本相关函数（已移到文件末尾，使用toggleVocabPanel）

// 悬浮球拖拽功能
function initFloatingVocabDrag() {
    const ball = document.getElementById('floatingVocabBall');
    if (!ball) return;
    
    let isDragging = false;
    let hasMoved = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;
    let startX = 0;
    let startY = 0;
    
    const vocabBall = ball.querySelector('.vocab-ball');
    
    // 移除原有的onclick，改用mousedown/mouseup判断
    vocabBall.removeAttribute('onclick');
    
    vocabBall.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
    
    function dragStart(e) {
        if (e.target.closest('.vocab-ball')) {
            e.preventDefault();
            
            // 每次开始拖拽时重新获取当前位置
            const rect = ball.getBoundingClientRect();
            currentX = rect.left;
            currentY = rect.top;
            
            initialX = e.clientX - currentX;
            initialY = e.clientY - currentY;
            startX = e.clientX;
            startY = e.clientY;
            isDragging = true;
            hasMoved = false;
            vocabBall.style.cursor = 'grabbing';
        }
    }
    
    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            const deltaX = Math.abs(e.clientX - startX);
            const deltaY = Math.abs(e.clientY - startY);
            
            // 如果移动超过5像素，认为是拖拽
            if (deltaX > 5 || deltaY > 5) {
                hasMoved = true;
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                
                // 限制在视口范围内
                const ballWidth = 60;
                const ballHeight = 60;
                const maxX = window.innerWidth - ballWidth;
                const maxY = window.innerHeight - ballHeight;
                
                currentX = Math.max(0, Math.min(currentX, maxX));
                currentY = Math.max(0, Math.min(currentY, maxY));
                
                // 使用fixed定位 + left/top
                ball.style.position = 'fixed';
                ball.style.right = 'auto';
                ball.style.top = 'auto';
                ball.style.transform = 'none';
                ball.style.left = currentX + 'px';
                ball.style.top = currentY + 'px';
            }
        }
    }
    
    function dragEnd(e) {
        if (isDragging) {
            isDragging = false;
            vocabBall.style.cursor = 'move';
            
            // 如果没有移动，认为是点击，展开/收起
            if (!hasMoved) {
                toggleVocabPanel();
            }
        }
    }
}

// 页面加载时初始化拖拽
setTimeout(() => {
    initFloatingVocabDrag();
}, 500);

function updateFloatingVocab() {
    const ball = document.getElementById('floatingVocabBall');
    const list = document.getElementById('floatingVocabList');
    
    if (paragraphVocabulary.length > 0) {
        ball.style.display = 'block';
        list.innerHTML = paragraphVocabulary.map((w, i) => {
            const isPhrase = w.word.includes(' ');
            return `
                <div style="margin-bottom: 10px; padding: 10px; background: #f8f9ff; border-radius: 8px; border-left: 3px solid #667eea;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                            <span style="font-weight: 600; color: #333; font-size: 15px;">${w.word}</span>
                            ${!isPhrase && w.phonetic ? `<span style="color: #667eea; font-size: 12px; font-family: 'Lucida Sans Unicode', 'Arial Unicode MS';">${w.phonetic}</span>` : ''}
                        </div>
                        <button onclick="speakWord('${w.word}')" style="background: none; border: none; cursor: pointer; font-size: 18px; padding: 0 5px;" title="发音">🔊</button>
                    </div>
                    ${!isPhrase && w.partOfSpeech ? `<div style="color: #999; font-size: 12px; margin-bottom: 5px;">${w.partOfSpeech}</div>` : ''}
                    <div style="color: #666; font-size: 14px;">${w.meaning}</div>
                </div>
            `;
        }).join('');
    } else {
        ball.style.display = 'none';
    }
}

function speakWord(word) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }
    speechSynthesis.speak(utterance);
}

function toggleVocabPanel() {
    const panel = document.getElementById('floatingVocabPanel');
    panel.classList.toggle('active');
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

console.log('📄 段落学习模块已加载');
