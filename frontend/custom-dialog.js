// 自定义对话框工具类
class CustomDialog {
    constructor() {
        this.currentDialog = null;
    }

    // 显示提示框（替代 alert）
    alert(message, title = '提示', type = 'info') {
        return new Promise((resolve) => {
            this.show({
                title,
                message,
                type,
                buttons: [
                    {
                        text: '确定',
                        primary: true,
                        onClick: async () => {
                            await this.close();
                            resolve(true);
                        }
                    }
                ]
            });
        });
    }

    // 显示确认框（替代 confirm）
    confirm(message, title = '确认', type = 'question') {
        return new Promise((resolve) => {
            this.show({
                title,
                message,
                type,
                buttons: [
                    {
                        text: '取消',
                        primary: false,
                        onClick: async () => {
                            await this.close();
                            resolve(false);
                        }
                    },
                    {
                        text: '确定',
                        primary: true,
                        onClick: async () => {
                            await this.close();
                            resolve(true);
                        }
                    }
                ]
            });
        });
    }

    // 显示成功提示
    success(message, title = '成功') {
        return this.alert(message, title, 'success');
    }

    // 显示错误提示
    error(message, title = '错误') {
        return this.alert(message, title, 'error');
    }

    // 显示警告提示
    warning(message, title = '警告') {
        return this.alert(message, title, 'warning');
    }

    // 显示信息提示
    info(message, title = '提示') {
        return this.alert(message, title, 'info');
    }

    // 通用显示方法
    show(options) {
        // 如果已有对话框，先关闭
        if (this.currentDialog) {
            this.close();
        }

        const { title, message, type = 'info', buttons = [] } = options;

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'custom-dialog-overlay';

        // 创建对话框
        const dialog = document.createElement('div');
        dialog.className = 'custom-dialog';

        // 图标映射
        const iconMap = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ',
            question: '?'
        };

        // 创建头部
        const header = document.createElement('div');
        header.className = 'custom-dialog-header';
        
        // 使用睿叮图标
        const iconHtml = `<img src="icon.png" alt="睿叮" onerror="this.parentElement.innerHTML='${iconMap[type] || 'ℹ'}'">`;
        
        header.innerHTML = `
            <div class="custom-dialog-icon ${type}">
                ${iconHtml}
            </div>
            <h2 class="custom-dialog-title">${this.escapeHtml(title)}</h2>
        `;

        // 创建内容
        const body = document.createElement('div');
        body.className = 'custom-dialog-body';
        body.innerHTML = `
            <p class="custom-dialog-message">${this.escapeHtml(message)}</p>
        `;

        // 创建底部按钮
        const footer = document.createElement('div');
        footer.className = 'custom-dialog-footer';

        buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.className = `custom-dialog-button ${button.primary ? 'custom-dialog-button-primary' : 'custom-dialog-button-secondary'}`;
            btn.textContent = button.text;
            btn.onclick = button.onClick;
            footer.appendChild(btn);
        });

        // 组装对话框
        dialog.appendChild(header);
        dialog.appendChild(body);
        dialog.appendChild(footer);
        overlay.appendChild(dialog);

        // 添加到页面
        document.body.appendChild(overlay);
        this.currentDialog = overlay;

        // 点击遮罩层关闭（仅在有取消按钮时）
        if (buttons.length > 1) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    const cancelButton = buttons.find(b => !b.primary);
                    if (cancelButton) {
                        cancelButton.onClick();
                    }
                }
            });
        }

        // ESC 键关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                const cancelButton = buttons.find(b => !b.primary);
                if (cancelButton) {
                    cancelButton.onClick();
                } else if (buttons.length > 0) {
                    buttons[0].onClick();
                }
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // 关闭对话框
    close() {
        return new Promise((resolve) => {
            if (this.currentDialog) {
                this.currentDialog.style.animation = 'fadeOut 0.2s ease';
                setTimeout(() => {
                    if (this.currentDialog && this.currentDialog.parentNode) {
                        this.currentDialog.parentNode.removeChild(this.currentDialog);
                    }
                    this.currentDialog = null;
                    resolve();
                }, 200);
            } else {
                resolve();
            }
        });
    }

    // HTML 转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 创建全局实例
window.customDialog = new CustomDialog();

// 覆盖原生 alert 和 confirm（可选）
window.showAlert = (message, title, type) => window.customDialog.alert(message, title, type);
window.showConfirm = (message, title) => window.customDialog.confirm(message, title);
window.showSuccess = (message, title) => window.customDialog.success(message, title);
window.showError = (message, title) => window.customDialog.error(message, title);
window.showWarning = (message, title) => window.customDialog.warning(message, title);
window.showInfo = (message, title) => window.customDialog.info(message, title);
