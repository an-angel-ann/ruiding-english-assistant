console.log('📄 app.js 文件已加载');

// 显示加载动画（与段落学习统一样式）
function showLoading(message = '加载中...') {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;
        overlay.innerHTML = `<div id="loadingMessage"></div>`;
        document.body.appendChild(overlay);
    }
    
    // 更新加载消息（使用小叮动画）
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
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
                            <div style="font-size: 15px; color: #333; line-height: 1.8;">${message}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

// 更新进度显示
function updateProgress(message) {
    const msgEl = document.getElementById('loadingMessage');
    if (msgEl) {
        msgEl.textContent = message;
    } else {
        console.log('进度:', message);
    }
}

// 全局变量
let apiKey = '';
let currentImage = null;
let sentences = [];
let currentSentenceIndex = 0;
let vocabularyBook = [];
let currentLearningData = {};
let reviewMode = 'en2cn'; // en2cn 或 cn2en
let currentVocabIndex = 0;

// 认证相关
const API_BASE_URL = 'http://localhost:3001/api';
let currentUser = null;
let subscriptionEndDate = null;
let countdownInterval = null;

// 鼓励语句数组
const encouragements = ['你真棒！', '做得对！', '难以置信！', '绝绝子！', '太厉害了！', '完美！', '优秀！', '真聪明！'];

// 全局showEncouragement函数
function showEncouragement() {
    const encouragement = document.getElementById('encouragement');
    if (encouragement) {
        const message = encouragements[Math.floor(Math.random() * encouragements.length)];
        encouragement.textContent = message;
        encouragement.classList.add('show');

        // 播放叮-咚双音和弦
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const now = audioContext.currentTime;
            
            // 第一个音"叮"（高音和弦）
            const dingFreqs = [1046.5, 1318.5]; // C6, E6
            dingFreqs.forEach((freq, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = freq;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                
                oscillator.start(now);
                oscillator.stop(now + 0.3);
            });
            
            // 第二个音"咚"（低音和弦，延迟0.15秒）
            const dongFreqs = [523.25, 659.25]; // C5, E5
            dongFreqs.forEach((freq, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = freq;
                oscillator.type = 'sine';
                
                const startTime = now + 0.15;
                gainNode.gain.setValueAtTime(0.2, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
                
                oscillator.start(startTime);
                oscillator.stop(startTime + 0.4);
            });
        } catch (e) {
            console.log('音效播放失败:', e);
        }

        setTimeout(() => {
            encouragement.classList.remove('show');
        }, 1500);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOMContentLoaded 事件触发');
    // 先检查认证
    await checkAuthentication();
    console.log('📄 认证检查完成，开始初始化上传功能');
    initializeUpload();
});

// 检查用户认证状态
async function checkAuthentication() {
    console.log('🔐 [index.html] 开始认证检查...');
    
    // 检查是否是特殊账号
    const isSpecialAccount = localStorage.getItem('isSpecialAccount') === 'true';
    const userApiKey = localStorage.getItem('userApiKey');
    
    if (isSpecialAccount && userApiKey) {
        console.log('   🔑 特殊账号模式，使用用户自己的API Key');
        console.log('   📦 API Key:', userApiKey.substring(0, 10) + '...');
        
        // 设置API Key
        window.apiKey = userApiKey;
        console.log('   ✅ window.apiKey 已设置');
        
        // 显示功能选择页面
        const modePanel = document.getElementById('modeSelectionPanel');
        const subGuide = document.getElementById('subscriptionGuide');
        console.log('   📍 modeSelectionPanel 元素:', modePanel ? '存在' : '不存在');
        console.log('   📍 subscriptionGuide 元素:', subGuide ? '存在' : '不存在');
        
        if (modePanel) modePanel.style.display = 'block';
        if (subGuide) subGuide.style.display = 'none';
        
        // 显示登出按钮和用户信息
        const logoutBtn = document.getElementById('logoutButton');
        console.log('   📍 logoutButton 元素:', logoutBtn ? '存在' : '不存在');
        console.log('   📍 logoutButton 当前 display:', logoutBtn ? logoutBtn.style.display : 'N/A');
        
        if (logoutBtn) {
            logoutBtn.style.display = 'flex';
            // 添加特殊用户样式类
            logoutBtn.classList.add('vip-user-menu');
            console.log('   ✅ logoutButton display 设置为 flex');
            console.log('   📍 logoutButton 新的 display:', logoutBtn.style.display);
            
            // 设置用户邮箱显示
            const emailDisplay = document.getElementById('userEmailDisplay');
            console.log('   📍 userEmailDisplay 元素:', emailDisplay ? '存在' : '不存在');
            
            if (emailDisplay) {
                emailDisplay.innerHTML = `VIP@Ruiding`;
                console.log('   ✅ userEmailDisplay 内容已设置');
            }
            
            // 隐藏会员订阅和设备管理按钮（特殊用户不需要）
            const subscriptionBtn = logoutBtn.querySelector('.btn-subscription');
            const deviceBtn = logoutBtn.querySelectorAll('.btn-subscription')[1];
            if (subscriptionBtn) {
                subscriptionBtn.style.display = 'none';
                console.log('   ✅ 已隐藏会员订阅按钮');
            }
            if (deviceBtn) {
                deviceBtn.style.display = 'none';
                console.log('   ✅ 已隐藏设备管理按钮');
            }
        } else {
            console.error('   ❌ logoutButton 元素未找到！');
        }
        
        // 显示语音选择器
        const voiceSelector = document.getElementById('voiceSelector');
        console.log('   📍 voiceSelector 元素:', voiceSelector ? '存在' : '不存在');
        console.log('   📍 voiceSelector 当前 display:', voiceSelector ? voiceSelector.style.display : 'N/A');
        
        if (voiceSelector) {
            voiceSelector.style.display = 'block';
            console.log('   ✅ voiceSelector display 设置为 block');
            console.log('   📍 voiceSelector 新的 display:', voiceSelector.style.display);
        } else {
            console.error('   ❌ voiceSelector 元素未找到！');
        }
        
        console.log('✅ [index.html] 特殊账号认证完成');
        console.log('✅ 用户已登录: ruiding.vip.user');
        console.log('✅ [index.html] 认证检查完成，页面加载成功');
        return;
    }
    
    const token = localStorage.getItem('authToken');
    console.log('   Token存在:', !!token);
    
    if (!token) {
        // 没有Token，跳转到登录页面
        console.log('   ❌ 无Token，跳转到登录页');
        window.location.href = 'auth.html';
        return;
    }
    
    try {
        // 验证Token并获取用户信息
        console.log('   发送认证请求到:', `${API_BASE_URL}/auth/me`);
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('   认证响应状态:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.log('   ❌ 认证失败:', errorData);
            throw new Error('Token无效: ' + (errorData.error || response.statusText));
        }
        
        const data = await response.json();
        console.log('   ✅ 认证成功，用户数据:', data.user);
        currentUser = data.user;
        
        // 显示登出按钮和用户信息（优先显示用户名，否则显示邮箱）
        document.getElementById('logoutButton').style.display = 'flex';
        const displayName = currentUser.username || currentUser.email;
        document.getElementById('userEmailDisplay').textContent = displayName;
        
        // 显示语音选择器
        const voiceSelector = document.getElementById('voiceSelector');
        if (voiceSelector) {
            voiceSelector.style.display = 'block';
        }
        
        // 检查订阅状态并自动配置AI Key
        console.log('🔍 检查订阅状态...');
        console.log('📦 完整响应数据:', data);
        
        if (data.subscription) {
            subscriptionEndDate = new Date(data.subscription.endDate);
            const now = new Date();
            const timeLeft = subscriptionEndDate - now;
            
            console.log('📅 订阅信息:', {
                planType: data.subscription.planType,
                startDate: data.subscription.startDate,
                endDate: data.subscription.endDate,
                status: data.subscription.status,
                endDate_parsed: subscriptionEndDate.toISOString(),
                now: now.toISOString(),
                timeLeft_ms: timeLeft,
                timeLeft_days: Math.ceil(timeLeft / (1000 * 60 * 60 * 24))
            });
            
            if (timeLeft > 0) {
                // 订阅仍有效（包括试用期），自动配置AI Key
                console.log('✅ 订阅有效！自动配置AI Key...');
                await autoConfigureAIKey(token);
                
                // 启动倒计时
                console.log('⏰ 启动倒计时...');
                startSubscriptionCountdown();
            } else {
                // 订阅已过期，显示引导页
                console.log('⚠️ 订阅已过期，需要续费');
                subscriptionEndDate = null;
                document.getElementById('apiKeyPanel').style.display = 'block';
            }
        } else {
            // 无订阅，显示引导页
            console.log('ℹ️ 无订阅记录，显示订阅引导页');
            document.getElementById('apiKeyPanel').style.display = 'block';
        }
        
        console.log('✅ 用户已登录:', currentUser.email);
        console.log('✅ [index.html] 认证检查完成，页面加载成功');
    } catch (error) {
        console.error('❌ [index.html] 认证失败:', error);
        console.error('   错误详情:', error.message);
        console.error('   即将清除Token并跳转回登录页...');
        // Token无效，清除并跳转到登录页面
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        window.location.href = 'auth.html';
    }
}

// 自动配置AI Key（付费用户专享）
async function autoConfigureAIKey(token) {
    try {
        console.log('🔑 请求AI Key...');
        const response = await fetch(`${API_BASE_URL}/subscription/api-key`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 API Key响应状态:', response.status);
        const data = await response.json();
        console.log('📦 API Key响应数据:', data);
        
        if (data.hasApiKey && data.apiKey) {
            // 自动配置AI Key
            apiKey = data.apiKey;
            console.log('✅ 已自动配置AI Key（会员专享）');
            console.log('🎯 隐藏订阅引导页，显示功能选择页');
            
            // 直接显示模式选择
            document.getElementById('apiKeyPanel').style.display = 'none';
            document.getElementById('modeSelectionPanel').style.display = 'block';
        } else {
            // 显示订阅引导页面
            console.log('⚠️ 未获取到API Key，显示订阅引导页');
            console.log('   hasApiKey:', data.hasApiKey);
            console.log('   apiKey:', data.apiKey ? '已设置' : '未设置');
            document.getElementById('apiKeyPanel').style.display = 'block';
        }
    } catch (error) {
        console.error('❌ 获取AI Key失败:', error);
        document.getElementById('apiKeyPanel').style.display = 'block';
    }
}

// 订阅倒计时
function startSubscriptionCountdown() {
    if (!subscriptionEndDate) return;
    
    // 清除旧的倒计时
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    // 更新倒计时显示
    function updateCountdown() {
        const now = new Date();
        const timeLeft = subscriptionEndDate - now;
        
        if (timeLeft <= 0) {
            // 订阅已到期
            clearInterval(countdownInterval);
            handleSubscriptionExpired();
            return;
        }
        
        // 计算剩余时间
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        // 更新显示
        let countdownText;
        if (days > 0) {
            countdownText = `${days}天 ${hours}小时 ${minutes}分`;
        } else if (hours > 0) {
            countdownText = `${hours}小时 ${minutes}分 ${seconds}秒`;
        } else {
            countdownText = `${minutes}分 ${seconds}秒`;
        }
        
        // 在登出按钮内部显示倒计时
        let countdownEl = document.getElementById('subscriptionCountdown');
        if (!countdownEl) {
            countdownEl = document.createElement('span');
            countdownEl.id = 'subscriptionCountdown';
            countdownEl.className = 'subscription-countdown';
            // 插入到会员订阅按钮之前
            const logoutContent = document.querySelector('.logout-btn-content');
            if (logoutContent) {
                logoutContent.insertBefore(countdownEl, logoutContent.querySelector('.btn-subscription'));
            }
        }
        
        // 格式化剩余时间显示
        let timeText;
        if (days > 0) {
            timeText = `${days}天${hours}小时${minutes}分钟`;
        } else if (hours > 0) {
            timeText = `${hours}小时${minutes}分钟`;
        } else {
            timeText = `${minutes}分钟${seconds}秒`;
        }
        
        countdownText = `⏰ ${timeText}`;
        countdownEl.textContent = countdownText;
    }
    
    // 立即更新一次
    updateCountdown();
    
    // 每秒更新
    countdownInterval = setInterval(updateCountdown, 1000);
}

// 处理订阅到期
async function handleSubscriptionExpired() {
    await showWarning('您的订阅已到期！\n\n请续费以继续使用AI智能学习功能。', '订阅到期');
    
    // 清除AI Key
    apiKey = '';
    subscriptionEndDate = null;
    
    // 移除倒计时显示
    const countdownEl = document.getElementById('subscriptionCountdown');
    if (countdownEl) {
        countdownEl.remove();
    }
    
    // 隐藏所有面板
    document.getElementById('modeSelectionPanel').style.display = 'none';
    document.getElementById('uploadPanel').style.display = 'none';
    document.getElementById('sentenceLearningPanel').style.display = 'none';
    document.getElementById('reviewPanel').style.display = 'none';
    
    // 显示订阅引导面板
    document.getElementById('apiKeyPanel').style.display = 'block';
}

// 登出功能
async function handleLogout() {
    const confirmed = await showConfirm('确定要登出吗？', '确认登出');
    if (confirmed) {
        // 清除倒计时
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        
        // 清除本地存储
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        
        // 跳转到登录页面
        window.location.href = 'auth.html';
    }
}

// 注：已移除手动输入AI Key功能，所有用户需订阅使用

// 选择学习模式
function selectMode(mode) {
    console.log('🎯 选择学习模式:', mode);
    
    // 隐藏所有面板
    const allPanels = document.querySelectorAll('.panel');
    allPanels.forEach(panel => {
        panel.style.display = 'none';
    });
    
    if (mode === 'sentence') {
        // 句子学习模式 - 重置所有状态
        resetSentenceLearning();
        document.getElementById('uploadPanel').style.display = 'block';
    } else if (mode === 'word') {
        // 单词学习模式
        document.getElementById('wordUploadPanel').style.display = 'block';
        initializeWordUpload();
    } else if (mode === 'paragraph') {
        // 段落学习模式
        document.getElementById('paragraphUploadPanel').style.display = 'block';
        initializeParagraphUpload();
    }
}

// 重置句子学习状态
function resetSentenceLearning() {
    console.log('🔄 重置句子学习状态...');
    
    // 重置全局变量
    currentImage = null;
    sentences = [];
    currentSentenceIndex = 0;
    vocabularyBook = [];
    currentLearningData = {};
    currentVocabIndex = 0;
    
    // 清空文件上传输入框
    const sentenceFileInput = document.getElementById('sentenceFileInput');
    if (sentenceFileInput) sentenceFileInput.value = '';
    
    // 清空粘贴文本区域
    const pasteTextArea = document.getElementById('pasteText');
    if (pasteTextArea) pasteTextArea.value = '';
    
    // 清空上传区域的预览图片
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        const existingImg = uploadArea.querySelector('img');
        if (existingImg) {
            existingImg.remove();
        }
        // 恢复默认提示文字
        const uploadText = uploadArea.querySelector('p');
        if (uploadText) {
            uploadText.style.display = 'block';
        }
    }
    
    // 清空识别结果显示区域
    const recognizedText = document.getElementById('recognizedText');
    if (recognizedText) recognizedText.textContent = '';
    
    const translatedText = document.getElementById('translatedText');
    if (translatedText) translatedText.textContent = '';
    
    // 隐藏所有学习面板
    const learningPanels = ['learningPanel', 'sentenceRecallPanel', 'vocabularyPanel', 'reviewPanel'];
    learningPanels.forEach(panelId => {
        const panel = document.getElementById(panelId);
        if (panel) panel.style.display = 'none';
    });
    
    console.log('✅ 句子学习状态已重置');
}

// 返回主页
function returnToHome() {
    // 隐藏所有面板
    const panels = document.querySelectorAll('.panel');
    panels.forEach(panel => {
        panel.style.display = 'none';
    });
    
    // 显示模式选择页面
    document.getElementById('modeSelectionPanel').style.display = 'block';
    
    // 重置部分状态（保留API Key）
    currentImage = null;
    sentences = [];
    currentSentenceIndex = 0;
    vocabularyBook = [];
    currentLearningData = {};
    currentVocabIndex = 0;
    
    // 清空文件上传输入框
    const sentenceFileInput = document.getElementById('sentenceFileInput');
    if (sentenceFileInput) sentenceFileInput.value = '';
    
    const wordFileInput = document.getElementById('wordFileInput');
    if (wordFileInput) wordFileInput.value = '';
    
    console.log('✅ 已返回主页');
}

// 初始化上传功能
function initializeUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    
    uploadArea.addEventListener('click', () => imageInput.click());
    
    imageInput.addEventListener('change', function(e) {
        handleImageUpload(e.target.files[0]);
    });
    
    // 拖拽上传
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#764ba2';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#667eea';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#667eea';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file);
        }
    });
}

// 处理图片上传
function handleImageUpload(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        currentImage = e.target.result;
        const previewArea = document.getElementById('previewArea');
        previewArea.innerHTML = `<img src="${e.target.result}" alt="上传的图片">`;
        
        // 自动开始分析
        await analyzeImage();
    };
    reader.readAsDataURL(file);
}

// 分析图片 - 调用阿里云API
async function analyzeImage() {
    if (!currentImage) {
        await showWarning('请先上传图片', '提示');
        return;
    }
    
    showLoading('正在识别图片中的文字...');
    
    try {
        // 检查图片大小
        const imageSize = currentImage.length;
        console.log('原始图片大小:', (imageSize / 1024 / 1024).toFixed(2), 'MB');
        
        // 如果图片超过2MB，进行压缩
        let processedImage = currentImage;
        if (imageSize > 2 * 1024 * 1024) {
            console.log('图片过大，开始压缩...');
            showLoading('图片较大，正在压缩...');
            processedImage = await compressImage(currentImage, 0.7);
            console.log('压缩后大小:', (processedImage.length / 1024 / 1024).toFixed(2), 'MB');
        }
        
        showLoading('正在识别图片中的文字...');
        
        // 调用OCR识别
        const ocrResult = await callAliOCR(processedImage);
        
        showLoading('正在翻译...');
        
        // 调用翻译API
        const translationResult = await callAliTranslation(ocrResult);
        
        hideLoading();
        displayTranslation(translationResult);
        
    } catch (error) {
        hideLoading();
        console.error('分析失败详情:', error);
        await showError('分析失败：' + error.message, '分析失败');
    }
}

// 图片压缩函数
async function compressImage(base64Image, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // 如果图片宽度超过1920，按比例缩小
            const maxWidth = 1920;
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // 转换为base64
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = base64Image;
    });
}

// callAliOCR 函数现在在 api-client.js 中定义

// callAliTranslation 函数现在在 api-client.js 中定义

// 显示翻译结果
function displayTranslation(translationResult) {
    sentences = translationResult;
    document.getElementById('uploadPanel').style.display = 'none';
    document.getElementById('translationPanel').style.display = 'block';
    
    const resultDiv = document.getElementById('translationResult');
    resultDiv.innerHTML = sentences.map((item, index) => `
        <div class="translation-item">
            <div class="english-text">${index + 1}. ${item.english}</div>
            <div class="chinese-text">${item.chinese}</div>
        </div>
    `).join('');
}

// 从文本分析句子
async function analyzeSentenceFromText() {
    const textInput = document.getElementById('sentenceTextInput');
    const text = textInput.value.trim();
    
    if (!text) {
        await showWarning('请输入英语句子', '提示');
        return;
    }
    
    showLoading('正在分析句子...');
    
    try {
        // 按句子分割文本（以句号、问号、感叹号为分隔符）
        const sentenceArray = text
            .split(/(?<=[.!?])\s+/)  // 按句子结束符号分割
            .map(s => s.trim())      // 去除首尾空格
            .filter(s => s.length > 0); // 过滤空句子
        
        console.log(`📝 识别到 ${sentenceArray.length} 个句子:`, sentenceArray);
        
        if (sentenceArray.length === 0) {
            throw new Error('未识别到有效句子，请确保句子以句号、问号或感叹号结尾');
        }
        
        // 调用翻译API，传入句子数组
        const translationResult = await callAliTranslation(sentenceArray);
        
        hideLoading();
        displayTranslation(translationResult);
        
    } catch (error) {
        hideLoading();
        console.error('分析失败:', error);
        await showError('分析失败：' + error.message, '分析失败');
    }
}

// 开始学习
async function startLearning() {
    currentSentenceIndex = 0;
    vocabularyBook = [];
    
    // 保留翻译面板显示，直到学习内容加载完成
    // document.getElementById('translationPanel').style.display = 'none';
    document.getElementById('totalSentences').textContent = sentences.length;
    
    await loadSentenceLearning();
}

// 加载当前句子的学习内容（带重试机制）
async function loadSentenceLearning() {
    if (currentSentenceIndex >= sentences.length) {
        finishAllSentences();
        return;
    }
    
    const sentence = sentences[currentSentenceIndex];
    updateProgress();
    
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
        attempt++;
        
        try {
            if (attempt === 1) {
                // 使用小叮动画（如果可用）
                if (typeof showSentenceAnimation === 'function') {
                    showLoading('正在生成学习内容...');
                    
                    // 强制重建loadingMessage元素（用于小叮动画）
                    let checkOverlay = document.getElementById('loadingOverlay');
                    let checkMessage = document.getElementById('loadingMessage');
                    if (checkOverlay && !checkMessage) {
                        checkOverlay.innerHTML = `<div id="loadingMessage"></div>`;
                    }
                    
                    // 等待loading元素完全渲染
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // 开始小叮动画
                    showSentenceAnimation([]);
                } else {
                    showLoading('正在生成学习内容...');
                }
            } else {
                showLoading(`正在重试生成学习内容... (第${attempt}次尝试)`);
            }
            
            // 获取句子分析数据
            currentLearningData = await analyzeSentence(sentence);
            
            // 停止小叮动画
            if (typeof hideSentenceAnimation === 'function') {
                hideSentenceAnimation();
            }
            hideLoading();
            
            // 等待一小段时间，让动画平滑结束
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // 🔄 重置所有按钮状态（关键修复）
            resetAllButtons();
            
            // 隐藏翻译面板，显示学习面板
            document.getElementById('translationPanel').style.display = 'none';
            document.getElementById('learningPanel').style.display = 'block';
            
            // 显示词义辨别部分
            setupWordMatching();
            document.getElementById('wordMatchingSection').style.display = 'block';
            document.getElementById('structureSection').style.display = 'none';
            document.getElementById('reorderSection').style.display = 'none';
            
            // 成功，跳出重试循环
            console.log(`✅ 第${attempt}次尝试成功`);
            return;
            
        } catch (error) {
            console.error(`❌ 第${attempt}次尝试失败:`, error.message);
            
            if (attempt >= maxRetries) {
                // 已达到最大重试次数
                hideLoading();
                const retry = await showConfirm(`生成学习内容失败（已尝试${maxRetries}次）：\n${error.message}\n\n点击"确定"继续重试，点击"取消"跳过此句`, '生成失败');
                
                if (retry) {
                    // 用户选择继续重试，重置attempt继续循环
                    attempt = 0;
                } else {
                    // 用户选择跳过
                    await showInfo('已跳过当前句子', '跳过');
                    currentSentenceIndex++;
                    await loadSentenceLearning();
                    return;
                }
            } else {
                // 等待1秒后重试
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
}

// 🔄 重置所有按钮状态
function resetAllButtons() {
    console.log('🔄 重置所有按钮状态');
    
    // 词义辨别按钮
    const wordCheckBtn = document.querySelector('#wordMatchingSection .btn-check');
    const wordNextBtn = document.querySelector('#wordMatchingSection .btn-next');
    if (wordCheckBtn) wordCheckBtn.style.display = 'block';
    if (wordNextBtn) wordNextBtn.style.display = 'none';
    
    // 结构分析按钮
    const structureCheckBtn = document.querySelector('#structureSection .btn-check');
    const structureNextBtn = document.querySelector('#structureSection .btn-next');
    if (structureCheckBtn) structureCheckBtn.style.display = 'block';
    if (structureNextBtn) structureNextBtn.style.display = 'none';
    
    // 句子重组按钮
    const reorderCheckBtn = document.querySelector('#reorderSection .btn-check');
    const reorderNextBtn = document.querySelector('#reorderSection .btn-next');
    if (reorderCheckBtn) reorderCheckBtn.style.display = 'block';
    if (reorderNextBtn) reorderNextBtn.style.display = 'none';
    
    console.log('✅ 按钮状态已重置');
}

// analyzeSentence 函数现在在 api-client.js 中定义

// 移动端用户按钮展开
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutButton');
    if (logoutBtn) {
        // 点击图标区域切换展开/收起
        logoutBtn.addEventListener('click', function(e) {
            // 如果点击的是登出按钮或订阅按钮，不切换状态
            if (e.target.closest('.btn-logout') || e.target.closest('.btn-subscription')) {
                return;
            }
            this.classList.toggle('active');
        });
        
        // 点击页面其他地方关闭
        document.addEventListener('click', function(e) {
            if (!logoutBtn.contains(e.target)) {
                logoutBtn.classList.remove('active');
            }
        });
    }
});
