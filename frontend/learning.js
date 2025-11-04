// 词义辨别设置
function setupWordMatching() {
    console.log('🔄 设置词义辨别，单词数量:', currentLearningData.words.length);
    
    // 显示原句参考
    const currentSentence = sentences[currentSentenceIndex];
    document.getElementById('referenceSentenceEn').textContent = currentSentence.english;
    document.getElementById('referenceSentenceCn').textContent = currentSentence.chinese;
    
    const englishContainer = document.getElementById('englishWords');
    const chineseContainer = document.getElementById('chineseWords');
    
    // 🔧 关键：完全清空旧内容
    englishContainer.innerHTML = '';
    chineseContainer.innerHTML = '';
    
    console.log('✅ 已清空旧内容');
    
    // 创建英文单词容器（添加朗读按钮）
    englishContainer.innerHTML = currentLearningData.words.map((word, index) => `
        <div class="word-item" data-index="${index}">
            <span>${word.english}</span>
            <button class="word-speak-btn" onclick="speakWord('${word.english.replace(/'/g, "\\'")}')">🔊</button>
            <button class="new-word-btn" onclick="addToVocabulary(${index})" title="加入生词本">+</button>
            <div class="drop-zone" data-target="${index}"></div>
        </div>
    `).join('');
    
    // 创建中文选项（随机打乱）
    const shuffled = shuffleArray([...currentLearningData.words]);
    chineseContainer.innerHTML = shuffled.map((word, index) => `
        <div class="word-option" draggable="true" data-chinese="${word.chinese}" data-english="${word.english}">
            ${word.chinese}
        </div>
    `).join('');
    
    console.log('✅ 已生成新HTML，drop zones数量:', englishContainer.querySelectorAll('.drop-zone').length);
    
    // 延迟初始化，确保DOM完全渲染
    setTimeout(function() {
        console.log('🔵 开始初始化拖拽，word-option数量:', document.querySelectorAll('.word-option').length);
        initializeDragAndDrop();
    }, 100);
}

// 初始化拖拽功能 - 完整版：支持鼠标+触摸+双向拖拽
function initializeDragAndDrop() {
    let draggedElement = null;
    let sourceContainer = null;
    let touchClone = null;

    // 为所有word-option添加拖拽事件
    function makeDraggable(element) {
        element.draggable = true;
        element.style.cursor = 'move';
        
        // ========== 桌面端：鼠标拖拽 ==========
        element.addEventListener('dragstart', function(e) {
            draggedElement = this;
            sourceContainer = this.parentElement;
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            // 减少颤动：设置拖拽图像
            e.dataTransfer.setDragImage(this, 50, 25);
        });
        
        element.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            draggedElement = null;
            sourceContainer = null;
        });

        // ========== 移动端：触摸拖拽 ==========
        element.addEventListener('touchstart', function(e) {
            // 先清理可能存在的旧克隆
            if (touchClone && touchClone.parentNode) {
                touchClone.remove();
                touchClone = null;
            }
            
            draggedElement = this;
            sourceContainer = this.parentElement;
            
            const touch = e.touches[0];
            
            // 创建拖拽克隆
            touchClone = this.cloneNode(true);
            touchClone.style.position = 'fixed';
            touchClone.style.zIndex = '9999';
            touchClone.style.opacity = '0.8';
            touchClone.style.pointerEvents = 'none';
            touchClone.style.width = this.offsetWidth + 'px';
            touchClone.style.left = '0';
            touchClone.style.top = '0';
            touchClone.style.transform = `translate(${touch.clientX - this.offsetWidth / 2}px, ${touch.clientY - 25}px)`;
            touchClone.style.transition = 'none';
            document.body.appendChild(touchClone);
            
            this.style.opacity = '0.3';
        }, { passive: false });


let rafId = null;
element.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (touchClone) {
        const touch = e.touches[0];
        
        // 使用requestAnimationFrame优化性能
        if (rafId) {
            cancelAnimationFrame(rafId);
        }
        
        rafId = requestAnimationFrame(function() {
            // 使用transform代替left/top，性能更好
            const x = touch.clientX - touchClone.offsetWidth / 2;
            const y = touch.clientY - 25;
            touchClone.style.transform = `translate(${x}px, ${y}px)`;
            touchClone.style.left = '0';
            touchClone.style.top = '0';
            
            // 高亮放置区域
            const dropZone = document.elementFromPoint(touch.clientX, touch.clientY);
            document.querySelectorAll('.drop-zone, .draggable-words').forEach(zone => {
                zone.classList.remove('drag-over');
            });
            if (dropZone) {
                const zone = dropZone.closest('.drop-zone') || dropZone.closest('.draggable-words');
                if (zone) {
                    zone.classList.add('drag-over');
                }
            }
            
            rafId = null;
        });
    }
}, { passive: false });

        element.addEventListener('touchend', function(e) {
            e.preventDefault();
            this.style.opacity = '1';
            
            if (touchClone) {
                const touch = e.changedTouches[0];
                const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
                const dropZone = targetElement ? (targetElement.closest('.drop-zone') || targetElement.closest('.draggable-words')) : null;
                
                if (dropZone && dropZone !== sourceContainer) {
                    // 如果目标区域已有内容，将其移回原位
                    const existingElement = dropZone.querySelector('.word-option');
                    if (existingElement && sourceContainer && dropZone.classList.contains('drop-zone')) {
                        sourceContainer.appendChild(existingElement);
                        makeDraggable(existingElement);
                    }
                    
                    // 移动拖拽的元素到目标区域
                    if (dropZone.classList.contains('drop-zone')) {
                        dropZone.innerHTML = '';
                    }
                    dropZone.appendChild(draggedElement);
                    makeDraggable(draggedElement);
                }
                
                // 清理
                touchClone.remove();
                touchClone = null;
                document.querySelectorAll('.drop-zone, .draggable-words').forEach(zone => {
                    zone.classList.remove('drag-over');
                });
            }
            
            draggedElement = null;
            sourceContainer = null;
        }, { passive: false });
    }
    
// 初始化所有选项为可拖拽
const wordOptions = document.querySelectorAll('.word-option');
console.log('🔵 找到word-option元素:', wordOptions.length);
wordOptions.forEach(function(el, index) {
    console.log(`🔵 [${index}] 绑定:`, el.textContent.trim());
    makeDraggable(el);
});
    
    // ========== 为放置区添加拖放事件（桌面端） ==========
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', function() {
            this.classList.remove('drag-over');
        });
        
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            
            if (draggedElement) {
                // 如果目标区域已有内容，将其移回原位
                const existingElement = this.querySelector('.word-option');
                if (existingElement && sourceContainer) {
                    sourceContainer.appendChild(existingElement);
                    makeDraggable(existingElement);
                }
                
                // 移动拖拽的元素到目标区域
                this.innerHTML = '';
                this.appendChild(draggedElement);
                makeDraggable(draggedElement);
            }
        });
    });

    // ========== 为中文选项容器也添加放置区功能（可以拖回去） ==========
    const chineseContainer = document.getElementById('chineseWords');
    if (chineseContainer) {
        chineseContainer.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        });
        
        chineseContainer.addEventListener('dragleave', function() {
            this.classList.remove('drag-over');
        });
        
        chineseContainer.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            if (draggedElement && sourceContainer && sourceContainer.classList.contains('drop-zone')) {
                // 从drop-zone拖回中文容器
                this.appendChild(draggedElement);
                makeDraggable(draggedElement);
            }
        });
    }

    // 暴露makeDraggable供外部使用
    window.makeDraggableElement = makeDraggable;
    
    // ========== 监听DOM变化，自动为新元素绑定事件 ==========
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    if (node.classList && node.classList.contains('word-option')) {
                        console.log('🟢 检测到新元素:', node.textContent);
                        makeDraggable(node);
                    }
                    const wordOptions = node.querySelectorAll ? node.querySelectorAll('.word-option') : [];
                    wordOptions.forEach(function(option) {
                        console.log('🟢 检测到子元素:', option.textContent);
                        makeDraggable(option);
                    });
                }
            });
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('✅ MutationObserver已启动');
}

// 检查词义匹配
function checkWordMatching() {
    console.log('=== 检查词义匹配 ===');
    console.log('当前单词数量:', currentLearningData.words.length);
    
    let allCorrect = true;
    const dropZones = document.querySelectorAll('#wordMatchingSection .drop-zone');
    
    console.log('找到的drop zones数量:', dropZones.length);
    
    dropZones.forEach(zone => {
        const targetIndex = parseInt(zone.dataset.target);
        
        // 🔧 关键修复：检查索引是否有效
        if (targetIndex >= currentLearningData.words.length) {
            console.log(`⚠️ 跳过无效的drop zone，索引 ${targetIndex} 超出范围`);
            return; // 跳过这个zone
        }
        
        const correctEnglish = currentLearningData.words[targetIndex].english;
        const droppedWord = zone.querySelector('.word-option');
        
        if (droppedWord) {
            const droppedEnglish = droppedWord.dataset.english;
            console.log(`检查: ${droppedEnglish} vs ${correctEnglish}`);
            if (droppedEnglish === correctEnglish) {
                zone.parentElement.classList.add('correct-answer');
                console.log('✅ 正确');
            } else {
                zone.parentElement.classList.add('incorrect-answer');
                allCorrect = false;
                console.log('❌ 错误');
            }
        } else {
            allCorrect = false;
            console.log('❌ 未放置');
        }
    });
    
    if (allCorrect) {
        console.log('🎉 全部正确！显示鼓励');
        showEncouragement();
        
        // 安全地切换按钮状态
        const checkBtn = document.querySelector('#wordMatchingSection .btn-check');
        const nextBtn = document.querySelector('#wordMatchingSection .btn-next');
        
        console.log('按钮元素查找结果:', {
            checkBtn: checkBtn ? '找到' : '未找到',
            nextBtn: nextBtn ? '找到' : '未找到'
        });
        
        if (checkBtn) {
            checkBtn.style.display = 'none';
            console.log('✅ 隐藏检查按钮');
        } else {
            console.error('❌ 找不到检查按钮');
        }
        
        if (nextBtn) {
            nextBtn.style.display = 'block';
            console.log('✅ 显示下一步按钮');
        } else {
            console.error('❌ 找不到下一步按钮');
        }
    } else {
        console.log('⚠️ 有错误，显示提示');
        alert('还有错误，请再试试！');
        // 清除错误标记
        setTimeout(() => {
            document.querySelectorAll('.incorrect-answer').forEach(el => {
                el.classList.remove('incorrect-answer');
            });
        }, 1000);
    }
}

// 添加到生词本
function addToVocabulary(index) {
    const word = currentLearningData.words[index];
    const exists = vocabularyBook.some(v => v.english === word.english);
    
    if (!exists) {
        vocabularyBook.push(word);
        alert(`已添加"${word.english}"到生词本`);
    } else {
        alert('该单词已在生词本中');
    }
}

// 下一步：结构分析
function nextToStructure() {
    document.getElementById('wordMatchingSection').style.display = 'none';
    document.getElementById('structureSection').style.display = 'block';
    setupStructureAnalysis();
}

// 设置结构分析
function setupStructureAnalysis() {
    const slotsContainer = document.getElementById('structureSlots');
    const partsContainer = document.getElementById('sentenceParts');
    
    // 创建句子成分插槽
    slotsContainer.innerHTML = currentLearningData.structure.map((item, index) => `
        <div class="structure-slot">
            <div class="slot-label">${item.component}：</div>
            <div class="drop-zone" data-structure-target="${index}"></div>
        </div>
    `).join('');
    
    // 创建句子部分选项（随机打乱）
    const shuffled = shuffleArray([...currentLearningData.structure]);
    partsContainer.innerHTML = shuffled.map(item => `
        <div class="word-option" draggable="true" data-content="${item.content}" data-component="${item.component}">
            ${item.content}
        </div>
    `).join('');
    
    initializeStructureDragDrop();
}

// 初始化结构分析拖拽 - 改进版：支持双向拖拽
function initializeStructureDragDrop() {
    let draggedElement = null;
    let sourceContainer = null;
    
    function makeDraggable(element) {
        element.draggable = true;
        element.style.cursor = 'move';
        
        element.addEventListener('dragstart', function(e) {
            draggedElement = this;
            sourceContainer = this.parentElement;
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        element.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            draggedElement = null;
            sourceContainer = null;
        });
    }
    
    // 初始化所有选项为可拖拽
    document.querySelectorAll('#sentenceParts .word-option').forEach(makeDraggable);
    
    // 为结构槽添加拖放事件
    document.querySelectorAll('#structureSlots .drop-zone').forEach(zone => {
        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        });
        
        zone.addEventListener('dragleave', function() {
            this.classList.remove('drag-over');
        });
        
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            
            if (draggedElement) {
                // 如果目标区域已有内容，将其移回原位
                const existingElement = this.querySelector('.word-option');
                if (existingElement && sourceContainer) {
                    sourceContainer.appendChild(existingElement);
                    makeDraggable(existingElement);
                }
                
                // 移动拖拽的元素到目标区域
                this.innerHTML = '';
                this.appendChild(draggedElement);
                makeDraggable(draggedElement);
            }
        });
    });
    
    // 为句子部分容器添加放置区功能（可以拖回去）
    const partsContainer = document.getElementById('sentenceParts');
    if (partsContainer) {
        partsContainer.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        partsContainer.addEventListener('drop', function(e) {
            e.preventDefault();
            if (draggedElement && sourceContainer.classList.contains('drop-zone')) {
                this.appendChild(draggedElement);
                makeDraggable(draggedElement);
            }
        });
    }
}

// 检查结构分析
function checkStructure() {
    console.log('=== 检查结构分析 ===');
    let allCorrect = true;
    const dropZones = document.querySelectorAll('#structureSlots .drop-zone');
    
    dropZones.forEach(zone => {
        const targetIndex = zone.dataset.structureTarget;
        const correctComponent = currentLearningData.structure[targetIndex].component;
        const droppedPart = zone.querySelector('.word-option');
        
        if (droppedPart) {
            const droppedComponent = droppedPart.dataset.component;
            console.log(`检查: ${droppedComponent} vs ${correctComponent}`);
            if (droppedComponent === correctComponent) {
                zone.parentElement.classList.add('correct-answer');
                console.log('✅ 正确');
            } else {
                zone.parentElement.classList.add('incorrect-answer');
                allCorrect = false;
                console.log('❌ 错误');
            }
        } else {
            allCorrect = false;
            console.log('❌ 未放置');
        }
    });
    
    if (allCorrect) {
        console.log('🎉 全部正确！显示鼓励');
        showEncouragement();
        
        // 安全地切换按钮状态
        const checkBtn = document.querySelector('#structureSection .btn-check');
        const nextBtn = document.querySelector('#structureSection .btn-next');
        
        console.log('按钮元素查找结果:', {
            checkBtn: checkBtn ? '找到' : '未找到',
            nextBtn: nextBtn ? '找到' : '未找到'
        });
        
        if (checkBtn) {
            checkBtn.style.display = 'none';
            console.log('✅ 隐藏检查按钮');
        } else {
            console.error('❌ 找不到检查按钮');
        }
        
        if (nextBtn) {
            nextBtn.style.display = 'block';
            console.log('✅ 显示下一步按钮');
        } else {
            console.error('❌ 找不到下一步按钮');
        }
    } else {
        console.log('⚠️ 有错误，显示提示');
        alert('还有错误，请再试试！');
        setTimeout(() => {
            document.querySelectorAll('.incorrect-answer').forEach(el => {
                el.classList.remove('incorrect-answer');
            });
        }, 1000);
    }
}

// 下一步：句子重组
function nextToReorder() {
    document.getElementById('structureSection').style.display = 'none';
    document.getElementById('reorderSection').style.display = 'block';
    setupReorder();
}

// 设置句子重组
function setupReorder() {
    const hintDiv = document.getElementById('chineseHint');
    const answerDiv = document.getElementById('reorderAnswer');
    const scrambledDiv = document.getElementById('scrambledWords');
    
    const currentSentence = sentences[currentSentenceIndex];
    hintDiv.textContent = currentSentence.chinese;
    
    answerDiv.innerHTML = '';
    
    // 创建打散的单词
    scrambledDiv.innerHTML = currentLearningData.scrambled.map(word => `
        <div class="word-option" draggable="true" data-word="${word}">
            ${word}
        </div>
    `).join('');
    
    initializeReorderDragDrop();
}
    
// 初始化重组拖拽 - 完全重写：支持鼠标+触摸+灵活排序+双向拖拽
function initializeReorderDragDrop() {
    let draggedElement = null;
    let sourceContainer = null;
    let touchClone = null;
    let rafId = null;
    
    function makeDraggable(element) {
        element.draggable = true;
        element.style.cursor = 'move';
        
        // ========== 桌面端：鼠标拖拽 ==========
        element.addEventListener('dragstart', function(e) {
            draggedElement = this;
            sourceContainer = this.parentElement;
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setDragImage(this, 50, 25);
        });
        
        element.addEventListener('dragend', function() {
            this.classList.remove('dragging');
        });
        
        // ========== 移动端：触摸拖拽 ==========
        element.addEventListener('touchstart', function(e) {
            draggedElement = this;
            sourceContainer = this.parentElement;
            
            const touch = e.touches[0];
            
            // 创建拖拽克隆
            touchClone = this.cloneNode(true);
            touchClone.style.position = 'fixed';
            touchClone.style.zIndex = '9999';
            touchClone.style.opacity = '0.8';
            touchClone.style.pointerEvents = 'none';
            touchClone.style.width = this.offsetWidth + 'px';
            touchClone.style.left = '0';
            touchClone.style.top = '0';
            touchClone.style.transform = `translate(${touch.clientX - this.offsetWidth / 2}px, ${touch.clientY - 25}px)`;
            touchClone.style.transition = 'none';
            document.body.appendChild(touchClone);
            
            this.style.opacity = '0.3';
        }, { passive: false });

        element.addEventListener('touchmove', function(e) {
            e.preventDefault();
            if (touchClone) {
                const touch = e.touches[0];
                
                if (rafId) {
                    cancelAnimationFrame(rafId);
                }
                
                rafId = requestAnimationFrame(function() {
                    const x = touch.clientX - touchClone.offsetWidth / 2;
                    const y = touch.clientY - 25;
                    touchClone.style.transform = `translate(${x}px, ${y}px)`;
                    
                    // 检测目标容器
                    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
                    const answerDiv = document.getElementById('reorderAnswer');
                    const scrambledDiv = document.getElementById('scrambledWords');
                    
// 如果在答案区域，实时调整位置
if (targetElement && answerDiv.contains(targetElement)) {
    // 只有当元素不在答案区时才移动
    if (draggedElement.parentElement !== answerDiv) {
        const afterElement = getDragAfterElement(answerDiv, touch.clientX);
        if (afterElement == null) {
            answerDiv.appendChild(draggedElement);
        } else {
            answerDiv.insertBefore(draggedElement, afterElement);
        }
    } else {
        // 已经在答案区，只调整顺序
        const afterElement = getDragAfterElement(answerDiv, touch.clientX);
        if (afterElement && afterElement !== draggedElement && afterElement !== draggedElement.nextSibling) {
            answerDiv.insertBefore(draggedElement, afterElement);
        }
    }
}
                    
                    rafId = null;
                });
            }
        }, { passive: false });

        element.addEventListener('touchend', function(e) {
            e.preventDefault();
            this.style.opacity = '1';
            
            if (touchClone) {
                const touch = e.changedTouches[0];
                const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
                const answerDiv = document.getElementById('reorderAnswer');
                const scrambledDiv = document.getElementById('scrambledWords');
                
                // 判断放置位置
                if (targetElement) {
                    if (answerDiv.contains(targetElement) || targetElement === answerDiv) {
                        // 放到答案区
                        const afterElement = getDragAfterElement(answerDiv, touch.clientX);
                        if (afterElement == null) {
                            answerDiv.appendChild(draggedElement);
                        } else {
                            answerDiv.insertBefore(draggedElement, afterElement);
                        }
                    } else if (scrambledDiv.contains(targetElement) || targetElement === scrambledDiv) {
                        // 拖回打散区
                        scrambledDiv.appendChild(draggedElement);
                    }
                }
                
                makeDraggable(draggedElement);
                
                // 清理
                touchClone.remove();
                touchClone = null;
            }
            
            draggedElement = null;
            sourceContainer = null;
        }, { passive: false });
        
        return element;
    }
    
    // 初始化打散区的所有选项
    document.querySelectorAll('#scrambledWords .word-option').forEach(element => {
        makeDraggable(element);
    });
    
    const answerDiv = document.getElementById('reorderAnswer');
    const scrambledDiv = document.getElementById('scrambledWords');
    
    // 答案区域的拖放事件（桌面端）
    answerDiv.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const afterElement = getDragAfterElement(this, e.clientX);
        const dragging = document.querySelector('.dragging');
        
        if (afterElement == null) {
            this.appendChild(dragging);
        } else {
            this.insertBefore(dragging, afterElement);
        }
    });
    
    answerDiv.addEventListener('drop', function(e) {
        e.preventDefault();
        if (draggedElement) {
            makeDraggable(draggedElement);
        }
    });
    
    // 打散区域的拖放事件（支持拖回）
    scrambledDiv.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });
    
    scrambledDiv.addEventListener('drop', function(e) {
        e.preventDefault();
        if (draggedElement && sourceContainer === answerDiv) {
            this.appendChild(draggedElement);
            makeDraggable(draggedElement);
        }
    });
    
    // 获取拖拽后应该插入的位置
    function getDragAfterElement(container, x) {
        const draggableElements = [...container.querySelectorAll('.word-option:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
}

// 检查句子重组 - 改进版：完全忽略标点符号
function checkReorder() {
    console.log('=== 检查句子重组 ===');
    const answerDiv = document.getElementById('reorderAnswer');
    const words = Array.from(answerDiv.querySelectorAll('.word-option')).map(el => el.dataset.word);
    const userAnswer = words.join(' ');
    const correctAnswer = sentences[currentSentenceIndex].english;
    
    // 标准化处理：完全移除标点符号，只比较单词
    function normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/[.,!?;:'"()""''—\-\[\]{}]/g, '')  // 移除所有标点符号
            .replace(/\s+/g, ' ')  // 多个空格变成一个
            .trim();
    }
    
    const normalizedUser = normalizeText(userAnswer);
    const normalizedCorrect = normalizeText(correctAnswer);
    
    console.log('用户答案:', userAnswer);
    console.log('移除标点后:', normalizedUser);
    console.log('正确答案:', correctAnswer);
    console.log('移除标点后:', normalizedCorrect);
    console.log('是否匹配:', normalizedUser === normalizedCorrect);
    
    if (normalizedUser === normalizedCorrect) {
        console.log('🎉 答案正确！显示鼓励');
        showEncouragement();
        answerDiv.classList.add('correct-answer');
        
        // 安全地切换按钮状态
        const checkBtn = document.querySelector('#reorderSection .btn-check');
        const nextBtn = document.querySelector('#reorderSection .btn-next');
        
        console.log('按钮元素查找结果:', {
            checkBtn: checkBtn ? '找到' : '未找到',
            nextBtn: nextBtn ? '找到' : '未找到'
        });
        
        if (checkBtn) {
            checkBtn.style.display = 'none';
            console.log('✅ 隐藏检查按钮');
        } else {
            console.error('❌ 找不到检查按钮');
        }
        
        if (nextBtn) {
            nextBtn.style.display = 'block';
            console.log('✅ 显示下一句按钮');
        } else {
            console.error('❌ 找不到下一句按钮');
        }
    } else {
        console.log('⚠️ 答案不正确，显示提示');
        console.log('差异对比:');
        console.log('  用户:', normalizedUser);
        console.log('  正确:', normalizedCorrect);
        
        // 友好提示：只显示单词对比，不要求标点符号
        alert(`答案不正确，请再试试！\n\n提示：检查单词顺序是否正确（不需要标点符号）\n\n您的答案：${normalizedUser}\n正确答案：${normalizedCorrect}`);
        answerDiv.classList.add('incorrect-answer');
        setTimeout(() => {
            answerDiv.classList.remove('incorrect-answer');
        }, 1000);
    }
}

// 下一句
function nextSentence() {
    currentSentenceIndex++;
    
    // 清除所有正确答案标记
    document.querySelectorAll('.correct-answer').forEach(el => {
        el.classList.remove('correct-answer');
    });
    
    loadSentenceLearning();
}

// 完成所有句子
function finishAllSentences() {
    document.getElementById('learningPanel').style.display = 'none';
    
    // 先进入句子回忆背诵环节
    startSentenceRecall();
}

// 显示生词本
function displayVocabulary() {
    document.getElementById('vocabularyPanel').style.display = 'block';
    
    const listDiv = document.getElementById('vocabularyList');
    listDiv.innerHTML = vocabularyBook.map(word => `
        <div class="vocabulary-item">
            <span class="vocab-english">${word.english}</span>
            <span class="vocab-chinese">${word.chinese}</span>
        </div>
    `).join('');
}

// 遮盖式记忆变量
let remainingWords = [];  // 剩余需要记忆的单词
let masteredWords = [];   // 已掌握的单词

// 开始生词复习 - 遮盖式记忆
function startVocabReview() {
    console.log('🎬 开始生词复习');
    
    // 初始化
    remainingWords = [...vocabularyBook];
    masteredWords = [];
    
    document.getElementById('vocabularyPanel').style.display = 'none';
    const reviewPanel = document.getElementById('reviewPanel');
    reviewPanel.style.display = 'block';
    
    // 使用事件委托 - 在父容器上监听点击
    setupReviewPanelEventDelegation();
    
    showNextVocabCard();
}

// 设置事件委托 - 直接在document上监听，最可靠
function setupReviewPanelEventDelegation() {
    console.log('🔧 设置全局点击监听器');
    
    // 移除可能存在的旧监听器
    if (window.vocabClickHandler) {
        document.removeEventListener('click', window.vocabClickHandler, true);
    }
    
    // 创建新的点击处理器
    window.vocabClickHandler = function(e) {
        const target = e.target;
        console.log('🖱️ 全局点击事件:', target.id, target.className);
        
        // 检查是否在reviewPanel内
        const reviewPanel = document.getElementById('reviewPanel');
        if (!reviewPanel || !reviewPanel.contains(target)) {
            return; // 不在reviewPanel内，忽略
        }
        
        console.log('✓ 点击在reviewPanel内');
        
        // 检查是否点击了翻转按钮
        if (target.id === 'flipCardBtn' || target.classList.contains('flip-hint')) {
            console.log('🔄 检测到翻转按钮点击！');
            e.preventDefault();
            e.stopPropagation();
            flipVocabCard();
            return;
        }
        
        // 检查是否点击了"没记住"按钮
        if (target.id === 'notRememberBtn' || target.classList.contains('btn-not-remember')) {
            console.log('❌ 检测到"没记住"按钮点击！');
            e.preventDefault();
            e.stopPropagation();
            markAsNotRemembered();
            return;
        }
        
        // 检查是否点击了"记住了"按钮
        if (target.id === 'rememberBtn' || target.classList.contains('btn-remember')) {
            console.log('✅ 检测到"记住了"按钮点击！');
            e.preventDefault();
            e.stopPropagation();
            markAsRemembered();
            return;
        }
    };
    
    // 在document上添加捕获阶段的监听器
    document.addEventListener('click', window.vocabClickHandler, true);
    
    console.log('✅ 全局事件委托已设置');
}

// 显示下一个单词卡片
function showNextVocabCard() {
    if (remainingWords.length === 0) {
        // 所有单词都已掌握
        showEncouragement();
        setTimeout(() => {
            showCompletionPanel();
        }, 1500);
        return;
    }
    
    // 随机选择一个单词
    const randomIndex = Math.floor(Math.random() * remainingWords.length);
    currentVocabIndex = randomIndex;
    
    const word = remainingWords[currentVocabIndex];
    
    // 更新进度
    document.getElementById('remainingCount').textContent = remainingWords.length;
    document.getElementById('masteredCount').textContent = masteredWords.length;
    
    // 显示单词（正面）
    document.getElementById('vocabWord').textContent = word.english;
    document.getElementById('vocabMeaning').textContent = word.chinese;
    
    // 重置卡片状态
    document.getElementById('vocabFront').style.display = 'flex';
    document.getElementById('vocabBack').style.display = 'none';
    
    console.log('📝 显示单词:', word.english);
    
    // 双重保险：直接在按钮上绑定事件
    setTimeout(() => {
        bindButtonDirectly();
    }, 50);
}

// 直接绑定按钮事件（双重保险）
function bindButtonDirectly() {
    console.log('🔧 直接绑定按钮事件');
    
    const flipBtn = document.getElementById('flipCardBtn');
    const notRememberBtn = document.getElementById('notRememberBtn');
    const rememberBtn = document.getElementById('rememberBtn');
    
    console.log('按钮元素:', {
        flipBtn: flipBtn,
        notRememberBtn: notRememberBtn,
        rememberBtn: rememberBtn
    });
    
    if (flipBtn) {
        // 移除所有旧的事件监听器
        const newFlipBtn = flipBtn.cloneNode(true);
        flipBtn.parentNode.replaceChild(newFlipBtn, flipBtn);
        
        // 添加新的事件监听器
        newFlipBtn.addEventListener('click', function(e) {
            console.log('🔄 直接绑定的翻转按钮被点击！');
            e.preventDefault();
            e.stopPropagation();
            flipVocabCard();
        }, false);
        
        // 也添加mousedown事件作为备选
        newFlipBtn.addEventListener('mousedown', function(e) {
            console.log('🖱️ mousedown事件触发');
        }, false);
        
        console.log('✅ 翻转按钮已直接绑定');
    } else {
        console.error('❌ 找不到flipCardBtn');
    }
    
    if (notRememberBtn) {
        const newNotRememberBtn = notRememberBtn.cloneNode(true);
        notRememberBtn.parentNode.replaceChild(newNotRememberBtn, notRememberBtn);
        newNotRememberBtn.addEventListener('click', function(e) {
            console.log('❌ 直接绑定的"没记住"按钮被点击！');
            e.preventDefault();
            e.stopPropagation();
            markAsNotRemembered();
        }, false);
        console.log('✅ "没记住"按钮已直接绑定');
    }
    
    if (rememberBtn) {
        const newRememberBtn = rememberBtn.cloneNode(true);
        rememberBtn.parentNode.replaceChild(newRememberBtn, rememberBtn);
        newRememberBtn.addEventListener('click', function(e) {
            console.log('✅ 直接绑定的"记住了"按钮被点击！');
            e.preventDefault();
            e.stopPropagation();
            markAsRemembered();
        }, false);
        console.log('✅ "记住了"按钮已直接绑定');
    }
}

// 翻转卡片 - 查看答案（句子学习专用）
function flipVocabCard() {
    console.log('🔄 执行flipVocabCard函数');
    const vocabFront = document.getElementById('vocabFront');
    const vocabBack = document.getElementById('vocabBack');
    console.log('vocabFront:', vocabFront, 'vocabBack:', vocabBack);
    
    if (vocabFront && vocabBack) {
        vocabFront.style.display = 'none';
        vocabBack.style.display = 'flex';
        console.log('✅ 卡片已翻转');
    } else {
        console.error('❌ 找不到卡片元素');
    }
}

// 标记为没记住 - 继续循环
function markAsNotRemembered() {
    // 不做任何操作，单词留在remainingWords中
    // 重新显示下一个单词
    showNextVocabCard();
}

// 标记为记住了 - 移除出列表
function markAsRemembered() {
    const word = remainingWords[currentVocabIndex];
    
    // 从剩余列表中移除
    remainingWords.splice(currentVocabIndex, 1);
    
    // 添加到已掌握列表
    masteredWords.push(word);
    
    // 鼓励
    showEncouragement();
    
    // 显示下一个
    setTimeout(() => {
        showNextVocabCard();
    }, 500);
}

// 显示完成界面
function showCompletionPanel() {
    // 如果没有学习句子，直接返回主页
    if (sentences.length === 0) {
        console.log('没有学习内容，自动返回主页');
        setTimeout(() => {
            returnToHome();
        }, 500);
        return;
    }
    
    // 隐藏其他面板
    const reviewPanel = document.getElementById('reviewPanel');
    if (reviewPanel) {
        reviewPanel.style.display = 'none';
    }
    
    document.getElementById('completionPanel').style.display = 'block';
    
    // 更新统计
    document.getElementById('totalSentencesLearned').textContent = sentences.length;
    document.getElementById('totalWordsMastered').textContent = masteredWords.length;
    
    // 生成预览内容并始终显示
    generateReviewContent();
    
    // 确保学习内容预览始终显示，这样返回主页按钮就在最下方
    document.getElementById('reviewContent').style.display = 'block';
}

// 生成复习内容
function generateReviewContent() {
    const sentencesDiv = document.getElementById('sentencesReview');
    const vocabularyDiv = document.getElementById('vocabularyReview');
    
    // 句子列表 - 显示原始学习句子
    let sentencesHTML = `
        <h4>📝 学习句子 (${sentences.length}句)</h4>
        ${sentences.map((s, i) => `
            <div class="sentence-item">
                <div class="english">${i + 1}. ${s.english}</div>
                <div class="chinese">${s.chinese}</div>
            </div>
        `).join('')}
    `;
    
    sentencesDiv.innerHTML = sentencesHTML;
    
    // 单词列表
    let vocabularyHTML = '';
    if (masteredWords.length > 0) {
        vocabularyHTML = `
            <h4>📚 掌握单词 (${masteredWords.length}个)</h4>
            ${masteredWords.map((w, i) => `
                <div class="vocab-item">
                    <div class="english">${i + 1}. ${w.english}</div>
                    <div class="chinese">${w.chinese}</div>
                </div>
            `).join('')}
        `;
    } else {
        vocabularyHTML = `
            <h4>📚 掌握单词 (0个)</h4>
            <div class="no-words-message">
                <p>🎯 本次学习的词汇都已掌握，没有需要复习的单词。</p>
                <p>💡 下次遇到不认识的单词时，记得点击"加入生词本"哦！</p>
            </div>
        `;
    }
    
    // 背诵自查结果 - 显示用户标记后的内容（放在掌握单词下方）
    if (recallSentences && recallSentences.length > 0) {
        vocabularyHTML += `
            <h4 style="margin-top: 30px; color: #667eea;">📖 背诵自查结果</h4>
            <p style="color: #666; font-size: 14px; margin-bottom: 15px;">红色标记的部分是你标记的错误内容</p>
            
            <h5 style="color: #667eea; margin-top: 20px; font-size: 1em;">中文句子（标记错误部分）</h5>
            ${recallSentences.map((s, i) => `
                <div class="sentence-item" style="background: #fff8f8;">
                    <div class="chinese" style="font-size: 1em;">${i + 1}. ${s.chineseMarked || s.chinese}</div>
                </div>
            `).join('')}
            
            <h5 style="color: #667eea; margin-top: 20px; font-size: 1em;">英文句子（标记错误部分）</h5>
            ${recallSentences.map((s, i) => `
                <div class="sentence-item" style="background: #f8f9ff;">
                    <div class="english" style="font-size: 1em;">${i + 1}. ${s.englishMarked || s.english}</div>
                </div>
            `).join('')}
        `;
    }
    
    vocabularyDiv.innerHTML = vocabularyHTML;
}

// 将mark标签转换为内联样式（用于Word/PDF导出）
function convertMarkToInlineStyle(html) {
    if (!html) return html;
    // 将 <mark class="error-mark">...</mark> 转换为带内联样式的 span
    // 使用红色背景，确保在PDF中清晰可见
    return html.replace(/<mark class="error-mark"[^>]*>/g, '<span style="background-color: #ff6b6b !important; color: white !important; padding: 3px 6px !important; border-radius: 4px !important; font-weight: bold !important; display: inline-block !important;">')
               .replace(/<\/mark>/g, '</span>');
}

// 导出为Word文档
async function exportToWord() {
    // 让用户选择导出格式
    const format = await showFormatSelectionDialog();
    if (!format) {
        console.log('用户取消导出');
        return;
    }
    
    console.log(`开始导出${format === 'pdf' ? 'PDF' : 'Word'}文档...`);
    
    // 生成HTML内容
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>句子学习成果 - ${new Date().toLocaleDateString()}</title>
    <style>
        body {
            font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif;
            line-height: 1.8;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
        }
        h1 {
            text-align: center;
            color: #2c3e50;
            border-bottom: 3px solid #667eea;
            padding-bottom: 15px;
        }
        h2 {
            color: #667eea;
            margin-top: 30px;
            border-left: 5px solid #667eea;
            padding-left: 15px;
        }
        .sentence-item, .vocab-item {
            margin: 15px 0;
            padding: 15px;
            background: #f8f9ff;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .english {
            font-size: 1.2em;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        .chinese {
            font-size: 1em;
            color: #555;
        }
        .stats {
            background: #667eea;
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            color: #999;
            font-size: 0.9em;
        }
        mark.error-mark {
            background-color: #ff6b6b !important;
            color: white !important;
            padding: 3px 6px !important;
            border-radius: 4px !important;
            font-weight: bold !important;
            display: inline-block !important;
        }
        /* 确保打印时样式生效 */
        @media print {
            mark.error-mark, span[style*="background-color: #ff6b6b"] {
                background-color: #ff6b6b !important;
                color: white !important;
                padding: 3px 6px !important;
                border-radius: 4px !important;
                font-weight: bold !important;
                display: inline-block !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
    </style>
</head>
<body>
    <h1>句子学习成果</h1>
    
    <div class="stats">
        <p><strong>学习日期：</strong>${new Date().toLocaleString('zh-CN')}</p>
        <p><strong>学习句子：</strong>${sentences.length} 句</p>
        <p><strong>生词本单词：</strong>${vocabularyBook.length} 个</p>
    </div>
    
    <h2>📝 学习句子</h2>
    ${sentences.map((s, i) => `
        <div class="sentence-item">
            <div class="english">${i + 1}. ${s.english}</div>
            <div class="chinese">${s.chinese}</div>
        </div>
    `).join('')}
    
    <h2>📚 生词本单词</h2>
    ${vocabularyBook.length > 0 ? vocabularyBook.map((w, i) => `
        <div class="vocab-item">
            <div class="english">${i + 1}. ${w.english}</div>
            <div class="chinese">${w.chinese}</div>
        </div>
    `).join('') : '<p style="color: #666;">本次学习的词汇都已掌握，没有需要复习的单词。</p>'}
    
    ${recallSentences && recallSentences.length > 0 ? `
    <h2 style="color: #667eea;">📖 背诵自查结果</h2>
    <p style="color: #666; margin-bottom: 15px;">红色标记的部分是你标记的错误内容</p>
    
    <h3 style="color: #667eea; margin-top: 20px;">中文句子（标记错误部分）</h3>
    ${recallSentences.map((s, i) => `
        <div class="sentence-item" style="background: #fff8f8;">
            <div class="chinese">${i + 1}. ${convertMarkToInlineStyle(s.chineseMarked || s.chinese)}</div>
        </div>
    `).join('')}
    
    <h3 style="color: #667eea; margin-top: 20px;">英文句子（标记错误部分）</h3>
    ${recallSentences.map((s, i) => `
        <div class="sentence-item" style="background: #f8f9ff;">
            <div class="english">${i + 1}. ${convertMarkToInlineStyle(s.englishMarked || s.english)}</div>
        </div>
    `).join('')}
    ` : ''}
    
    <div class="footer">
        <p>睿叮AI英语学习助手 - 生成于 ${new Date().toLocaleString('zh-CN')}</p>
    </div>
</body>
</html>
    `;
    
    // 根据格式设置文件名和类型
    const dateStr = new Date().toISOString().slice(0,10);
    const filename = format === 'pdf' 
        ? `句子学习成果_${dateStr}.pdf`
        : `句子学习成果_${dateStr}.doc`;
    
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
                alert(`✅ 导出成功！\n\n文件已保存至：\n${result.filePath}`);
            } else {
                console.error('❌ 保存失败:', result.error);
                alert(`❌ 保存失败：${result.error || '未知错误'}`);
            }
        } catch (error) {
            console.error('❌ 导出失败:', error);
            alert(`❌ 导出失败：${error.message}`);
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
            alert('✅ 导出成功！\n文件已保存到下载文件夹');
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

// 工具函数
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function updateProgress() {
    const progress = ((currentSentenceIndex + 1) / sentences.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('currentSentence').textContent = currentSentenceIndex + 1;
}

function showEncouragement() {
    const encouragement = document.getElementById('encouragement');
    const message = encouragements[Math.floor(Math.random() * encouragements.length)];
    encouragement.textContent = message;
    encouragement.classList.add('show');
    
    // 🔊 播放成功音效
    playSuccessSound();
    
    setTimeout(() => {
        encouragement.classList.remove('show');
    }, 1500);
}

// 🔊 播放成功音效（使用Web Audio API）
function playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 创建一个欢快的上升音效
        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // 音效参数
        oscillator.type = 'sine';  // 柔和的声音
        oscillator.frequency.setValueAtTime(523.25, now);  // C5
        oscillator.frequency.setValueAtTime(659.25, now + 0.1);  // E5
        oscillator.frequency.setValueAtTime(783.99, now + 0.2);  // G5
        
        // 音量淡入淡出
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        oscillator.start(now);
        oscillator.stop(now + 0.4);
    } catch (error) {
        console.log('无法播放音效:', error);
    }
}

// 🔊 朗读句子
function speakSentence() {
    const text = document.getElementById('referenceSentenceEn').textContent;
    speakText(text);
}

// 🔊 朗读单词
function speakWord(word) {
    speakText(word);
}

// 🔊 通用朗读函数（使用Web Speech API，使用用户选择的语音）
function speakText(text) {
    try {
        // 检查浏览器是否支持
        if (!('speechSynthesis' in window)) {
            console.warn('浏览器不支持语音合成');
            alert('您的浏览器不支持语音朗读功能');
            return;
        }
        
        // 停止当前朗读
        window.speechSynthesis.cancel();
        
        // 创建语音合成实例
        const utterance = new SpeechSynthesisUtterance(text);
        
        // 使用用户选择的语音（如果有）
        if (window.selectedVoice) {
            utterance.voice = window.selectedVoice;
            utterance.lang = window.selectedVoice.lang;
        } else {
            utterance.lang = 'en-US';  // 默认英语
        }
        
        // 设置语音参数
        utterance.rate = 0.9;       // 语速（0.1-10，默认1）
        utterance.pitch = 1;        // 音调（0-2，默认1）
        utterance.volume = 1;       // 音量（0-1，默认1）
        
        // 播放
        window.speechSynthesis.speak(utterance);
        
        console.log('🔊 朗读:', text, '使用语音:', window.selectedVoice?.name || '默认');
    } catch (error) {
        console.error('朗读失败:', error);
    }
}

function showLoading(message) {
    // 先移除已存在的loading
    hideLoading();
    
    // 创建新的加载提示
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    // 使用半透明背景（50%不透明度），提供更好的视觉对比
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;color:white;font-size:1.5em;';
    overlay.innerHTML = `
        <div style="margin-bottom: 20px;">${message}</div>
        <div id="loadingProgress" style="font-size: 0.8em; color: white;"></div>
        <div id="recognizedWordsList" style="margin-top: 30px; max-width: 600px; max-height: 300px; overflow-y: auto; display: none;"></div>
    `;
    document.body.appendChild(overlay);
}

function updateLoadingProgress(progress) {
    const progressDiv = document.getElementById('loadingProgress');
    if (progressDiv) {
        progressDiv.textContent = progress;
    }
}

// 添加已识别的单词到显示列表
function addRecognizedWord(word, meaning, pos) {
    const wordsList = document.getElementById('recognizedWordsList');
    if (!wordsList) return;
    
    // 首次添加时显示列表
    if (wordsList.style.display === 'none') {
        wordsList.style.display = 'block';
        wordsList.innerHTML = '<div style="font-size: 0.6em; color: #4caf50; margin-bottom: 15px; border-bottom: 1px solid #4caf50; padding-bottom: 10px;">✨ 已识别的单词</div>';
    }
    
    // 创建单词卡片
    const wordCard = document.createElement('div');
    wordCard.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 10px;
        padding: 12px 20px;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        animation: slideIn 0.5s ease-out;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    `;
    
    wordCard.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; width: 100%;">
            <div style="flex: 1;">
                <div style="font-size: 0.7em; margin-bottom: 5px;">
                    <span style="font-weight: bold; font-size: 1.2em; color: #fff;">${word}</span>
                    <span style="color: #e0e0e0; margin-left: 8px;">${pos || ''}</span>
                </div>
                <div style="font-size: 0.6em; color: #ffd700;">${meaning || '加载中...'}</div>
            </div>
            <button onclick="speakWord('${word.replace(/'/g, "\\'")}')" style="background: rgba(255,255,255,0.2); border: 2px solid white; color: white; border-radius: 50%; width: 36px; height: 36px; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">🔊</button>
        </div>
    `;
    
    wordsList.appendChild(wordCard);
    
    // 自动滚动到底部
    wordsList.scrollTop = wordsList.scrollHeight;
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

// ========== 句子回忆背诵功能 ==========

let recallSentences = []; // 用于回忆的句子列表
let recallStats = {
    cn2en: 0, // 记住中译英的数量
    en2cn: 0  // 记住英译中的数量
};
let errorWords = []; // 标记为错误的单词列表

// 开始句子回忆背诵
function startSentenceRecall() {
    console.log('开始句子回忆背诵环节');
    
    // 准备回忆句子列表
    recallSentences = sentences.map(s => ({
        english: s.english,
        chinese: s.chinese,
        flipped: false // 是否已翻转
    }));
    
    // 重置统计
    recallStats = { cn2en: 0, en2cn: 0 };
    
    // 显示回忆背诵面板
    displaySentenceRecallPanel();
}

// 显示句子回忆背诵面板
function displaySentenceRecallPanel() {
    // 隐藏其他面板
    document.getElementById('learningPanel').style.display = 'none';
    document.getElementById('vocabularyPanel').style.display = 'none';
    
    // 创建或显示回忆面板
    let recallPanel = document.getElementById('sentenceRecallPanel');
    if (!recallPanel) {
        recallPanel = document.createElement('div');
        recallPanel.id = 'sentenceRecallPanel';
        recallPanel.className = 'panel';
        document.querySelector('.container').appendChild(recallPanel);
    }
    
    recallPanel.style.display = 'block';
    
    // 构建HTML
    recallPanel.innerHTML = `
        <h2>📖 步骤四：背诵自查</h2>
        <p style="color: #666; margin-bottom: 20px;">💡 点击卡片任意位置切换中英文，双击文字可标记错误部分</p>
        
        <div id="recallSentencesList" style="margin-bottom: 30px;">
            ${recallSentences.map((s, i) => `
                <div class="recall-sentence-card" data-index="${i}" onclick="flipRecallSentence(${i})">
                    <div class="card-number">${i + 1}</div>
                    <div class="sentence-content">
                        <div class="sentence-text-en ${s.flipped ? 'hidden' : 'visible'}" id="en-sentence-${i}" contenteditable="true" onmouseup="handleTextSelection(${i}, 'en')" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()">${s.english}</div>
                        <div class="sentence-text ${s.flipped ? 'visible' : 'hidden'}" id="cn-sentence-${i}" contenteditable="true" onmouseup="handleTextSelection(${i}, 'cn')" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()">${s.chinese}</div>
                    </div>
                    <div class="flip-icon">🔄</div>
                </div>
            `).join('')}
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: center; margin-top: 30px;">
            <button onclick="markRecallMemorized('en2cn')" class="recall-pink-btn" style="flex: 1; max-width: 200px; padding: 14px 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 500; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(240, 147, 251, 0.3);">
                ✅ 我学会了英译中
            </button>
            <button onclick="markRecallMemorized('cn2en')" class="recall-pink-btn" style="flex: 1; max-width: 200px; padding: 14px 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 500; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(240, 147, 251, 0.3);">
                ✅ 我学会了中译英
            </button>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
            <button onclick="finishSentenceRecall()" class="btn-next">
                进入复习
            </button>
        </div>
    `;
    
    // 添加样式
    addRecallStyles();
}

// 切换句子显示（中文/英文）
function flipRecallSentence(index) {
    recallSentences[index].flipped = !recallSentences[index].flipped;
    
    const card = document.querySelector(`.recall-sentence-card[data-index="${index}"]`);
    if (!card) {
        console.error('找不到卡片，index:', index);
        return;
    }
    
    const chineseText = card.querySelector('.sentence-text');
    const englishText = card.querySelector('.sentence-text-en');
    
    if (!chineseText || !englishText) {
        console.error('找不到文本元素');
        return;
    }
    
    if (recallSentences[index].flipped) {
        // 切换到中文
        englishText.classList.remove('visible');
        englishText.classList.add('hidden');
        chineseText.classList.remove('hidden');
        chineseText.classList.add('visible');
    } else {
        // 切换到英文（默认）
        chineseText.classList.remove('visible');
        chineseText.classList.add('hidden');
        englishText.classList.remove('hidden');
        englishText.classList.add('visible');
    }
}

// 标记已记住
function markRecallMemorized(type) {
    if (type === 'cn2en') {
        recallStats.cn2en++;
        showEncouragement('太棒了！中译英记住了！🎉');
    } else {
        recallStats.en2cn++;
        showEncouragement('很好！英译中记住了！🎊');
    }
    
    console.log('记忆统计:', recallStats);
}

// 处理文本选择和标记
function handleTextSelection(sentenceIndex, lang) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (!selectedText) return;
    
    // 获取选中的范围
    const range = selection.getRangeAt(0);
    
    // 创建标记元素
    const mark = document.createElement('mark');
    mark.className = 'error-mark';
    mark.style.backgroundColor = '#ff6b6b';
    mark.style.color = 'white';
    mark.style.padding = '2px 4px';
    mark.style.borderRadius = '3px';
    mark.style.cursor = 'pointer';
    mark.textContent = selectedText;
    mark.onclick = function(e) {
        e.stopPropagation();
        // 点击已标记的文本可以取消标记
        const parent = this.parentNode;
        parent.replaceChild(document.createTextNode(this.textContent), this);
        updateMarkedContent(sentenceIndex, lang);
    };
    
    // 替换选中的文本
    try {
        range.deleteContents();
        range.insertNode(mark);
    } catch (e) {
        console.error('标记失败:', e);
    }
    
    // 清除选择
    selection.removeAllRanges();
    
    // 更新标记内容
    updateMarkedContent(sentenceIndex, lang);
}

// 更新标记后的内容
function updateMarkedContent(sentenceIndex, lang) {
    const elementId = lang === 'cn' ? `cn-sentence-${sentenceIndex}` : `en-sentence-${sentenceIndex}`;
    const element = document.getElementById(elementId);
    
    if (element) {
        const markedHTML = element.innerHTML;
        
        if (lang === 'cn') {
            recallSentences[sentenceIndex].chineseMarked = markedHTML;
        } else {
            recallSentences[sentenceIndex].englishMarked = markedHTML;
        }
        
        console.log(`已更新句子 ${sentenceIndex} 的${lang === 'cn' ? '中文' : '英文'}标记:`, markedHTML);
    }
}

// 完成句子回忆，进入生词本
function finishSentenceRecall() {
    // 保存所有句子的当前HTML内容（包括标记）
    recallSentences.forEach((s, i) => {
        const cnElement = document.getElementById(`cn-sentence-${i}`);
        const enElement = document.getElementById(`en-sentence-${i}`);
        
        if (cnElement) {
            s.chineseMarked = cnElement.innerHTML;
        }
        if (enElement) {
            s.englishMarked = enElement.innerHTML;
        }
    });
    
    console.log('已保存所有句子的标记内容:', recallSentences);
    
    document.getElementById('sentenceRecallPanel').style.display = 'none';
    
    if (vocabularyBook.length > 0) {
        // 有生词，进入生词复习流程
        displayVocabulary();
    } else {
        // 没有生词，直接显示完成页面
        showCompletionPanel();
    }
}

// 添加回忆背诵的样式
function addRecallStyles() {
    if (document.getElementById('recallStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'recallStyles';
    style.textContent = `
        .recall-sentence-card {
            position: relative;
            margin-bottom: 20px;
            cursor: pointer;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 16px;
            padding: 25px 60px 25px 70px;
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            min-height: 100px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }
        
        .recall-sentence-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
            pointer-events: none;
        }
        
        .recall-sentence-card:hover {
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
            transform: translateY(-3px) scale(1.01);
        }
        
        .recall-sentence-card:active {
            transform: translateY(-1px) scale(0.99);
        }
        
        .card-number {
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            width: 36px;
            height: 36px;
            background: rgba(255, 255, 255, 0.25);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: bold;
            color: white;
            backdrop-filter: blur(10px);
        }
        
        .flip-icon {
            position: absolute;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 24px;
            opacity: 0.7;
            transition: all 0.3s ease;
        }
        
        .recall-sentence-card:hover .flip-icon {
            opacity: 1;
            transform: translateY(-50%) rotate(180deg);
        }
        
        .sentence-content {
            position: relative;
            width: 100%;
            min-height: 50px;
            z-index: 1;
        }
        
        .sentence-text,
        .sentence-text-en {
            position: absolute;
            width: 100%;
            text-align: center;
            font-size: 18px;
            line-height: 1.6;
            color: white;
            transition: opacity 0.4s ease, transform 0.4s ease;
        }
        
        .sentence-text.visible,
        .sentence-text-en.visible {
            opacity: 1;
            transform: translateY(0);
            position: relative;
        }
        
        .sentence-text.hidden,
        .sentence-text-en.hidden {
            opacity: 0;
            transform: translateY(10px);
            position: absolute;
            pointer-events: none;
        }
        
        .sentence-text-en {
            font-weight: 500;
        }
        
        .recall-word {
            cursor: pointer;
            padding: 2px 4px;
            border-radius: 4px;
            transition: all 0.2s ease;
        }
        
        .recall-word:hover {
            background: rgba(102, 126, 234, 0.1);
        }
        
        .recall-word.word-error {
            background: #ff6b6b;
            color: white;
            font-weight: bold;
        }
        
        /* 粉色按键悬停效果 */
        .recall-pink-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(240, 147, 251, 0.4) !important;
        }
        
        .recall-pink-btn:active {
            transform: translateY(0);
            box-shadow: 0 2px 8px rgba(240, 147, 251, 0.3) !important;
        }
    `;
    document.head.appendChild(style);
}

// 将函数暴露到全局作用域（确保Electron环境可访问）
window.flipVocabCard = flipVocabCard;
window.markAsNotRemembered = markAsNotRemembered;
window.markAsRemembered = markAsRemembered;
window.setupReviewPanelEventDelegation = setupReviewPanelEventDelegation;

console.log('📚 句子回忆背诵功能已加载');
console.log('🌐 全局函数已暴露:', {
    flipVocabCard: typeof window.flipVocabCard,
    markAsNotRemembered: typeof window.markAsNotRemembered,
    markAsRemembered: typeof window.markAsRemembered,
    setupReviewPanelEventDelegation: typeof window.setupReviewPanelEventDelegation
});
