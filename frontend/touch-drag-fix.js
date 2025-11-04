/**
 * 触屏拖拽防复制 - 激进版
 */
(function() {
    'use strict';
    
    console.log('🔧 触屏防复制系统启动');
    
    var isTouchDevice = 'ontouchstart' in window;
    if (!isTouchDevice) return;
    
    // 强制清理函数 - 使用最直接的方式
    function forceCleanup() {
        var answer = document.getElementById('reorderAnswer');
        var scrambled = document.getElementById('scrambledWords');
        
        if (!answer || !scrambled) return;
        
        // 收集所有单词文本
        var allWords = {};
        var toRemove = [];
        
        // 先遍历答案区
        var answerWords = answer.querySelectorAll('.word-option');
        answerWords.forEach(function(el) {
            var text = el.textContent.trim();
            if (allWords[text]) {
                toRemove.push(el);
            } else {
                allWords[text] = 'answer';
            }
        });
        
        // 再遍历打散区
        var scrambledWords = scrambled.querySelectorAll('.word-option');
        scrambledWords.forEach(function(el) {
            var text = el.textContent.trim();
            if (allWords[text]) {
                // 如果答案区已有，删除打散区的
                if (allWords[text] === 'answer') {
                    toRemove.push(el);
                } else {
                    // 打散区内部重复
                    toRemove.push(el);
                }
            } else {
                allWords[text] = 'scrambled';
            }
        });
        
        // 执行删除
        if (toRemove.length > 0) {
            console.log('🗑️ 强制删除', toRemove.length, '个重复元素');
            toRemove.forEach(function(el) {
                console.log('  - 删除:', el.textContent.trim());
                el.parentNode.removeChild(el);
            });
        }
    }
    
    // 1. 超高频清理（每50ms）
    setInterval(forceCleanup, 50);
    
    // 2. 拦截所有触摸事件
    var touchCount = 0;
    document.addEventListener('touchstart', function() {
        touchCount++;
    }, true);
    
    document.addEventListener('touchmove', function() {
        if (touchCount > 0) {
            forceCleanup();
        }
    }, true);
    
    document.addEventListener('touchend', function() {
        touchCount = 0;
        // 触摸结束后连续清理3次
        setTimeout(forceCleanup, 0);
        setTimeout(forceCleanup, 50);
        setTimeout(forceCleanup, 100);
    }, true);
    
    // 3. 使用requestAnimationFrame持续清理
    function continuousClean() {
        var reorderSection = document.getElementById('reorderSection');
        if (reorderSection && reorderSection.style.display !== 'none') {
            forceCleanup();
        }
        requestAnimationFrame(continuousClean);
    }
    requestAnimationFrame(continuousClean);
    
    console.log('✅ 激进清理已启动');
    console.log('- 每50ms清理');
    console.log('- 触摸时实时清理');
    console.log('- requestAnimationFrame持续清理');
})();
