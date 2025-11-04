// 设备指纹生成库
class DeviceFingerprint {
    constructor() {
        this.fingerprint = null;
        this.deviceInfo = null;
    }

    async generate() {
        if (this.fingerprint) return this.fingerprint;
        
        const components = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
            timezone: new Date().getTimezoneOffset(),
            canvas: await this.getCanvasFingerprint()
        };

        this.fingerprint = await this.hashComponents(components);
        this.deviceInfo = this.getDeviceInfo();
        return this.fingerprint;
    }
    
    getDeviceInfo() {
        const ua = navigator.userAgent;
        const platform = navigator.platform;
        
        // 检测设备类型
        let deviceType = '未知设备';
        let deviceModel = '';
        
        // 检测移动设备
        if (/iPhone/i.test(ua)) {
            deviceType = 'iPhone';
            const match = ua.match(/iPhone OS (\d+_\d+)/);
            deviceModel = match ? `iOS ${match[1].replace('_', '.')}` : '';
        } else if (/iPad/i.test(ua)) {
            deviceType = 'iPad';
            const match = ua.match(/OS (\d+_\d+)/);
            deviceModel = match ? `iPadOS ${match[1].replace('_', '.')}` : '';
        } else if (/Android/i.test(ua)) {
            if (/Mobile/i.test(ua)) {
                deviceType = 'Android手机';
            } else {
                deviceType = 'Android平板';
            }
            const match = ua.match(/Android (\d+\.?\d*)/);
            deviceModel = match ? `Android ${match[1]}` : '';
        }
        // 检测桌面设备
        else if (/Macintosh/i.test(ua) || /Mac OS X/i.test(ua)) {
            deviceType = 'MacBook';
            const match = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
            if (match) {
                deviceModel = `macOS ${match[1].replace(/_/g, '.')}`;
            }
        } else if (/Windows/i.test(ua)) {
            deviceType = 'Windows笔记本';
            if (/Windows NT 10/i.test(ua)) deviceModel = 'Windows 10/11';
            else if (/Windows NT 6.3/i.test(ua)) deviceModel = 'Windows 8.1';
            else if (/Windows NT 6.2/i.test(ua)) deviceModel = 'Windows 8';
            else if (/Windows NT 6.1/i.test(ua)) deviceModel = 'Windows 7';
        } else if (/Linux/i.test(ua) && !/Android/i.test(ua)) {
            deviceType = 'Linux电脑';
            deviceModel = 'Linux';
        }
        
        // 获取浏览器信息
        let browser = '未知浏览器';
        if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) browser = 'Chrome';
        else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
        else if (/Firefox/i.test(ua)) browser = 'Firefox';
        else if (/Edge/i.test(ua)) browser = 'Edge';
        
        return {
            type: deviceType,
            model: deviceModel,
            browser: browser,
            readable: `${deviceType}${deviceModel ? ' (' + deviceModel + ')' : ''} - ${browser}`
        };
    }
    
    getReadableName() {
        if (!this.deviceInfo) {
            this.deviceInfo = this.getDeviceInfo();
        }
        return this.deviceInfo.readable;
    }

    async getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 200;
            canvas.height = 50;
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#667eea';
            ctx.fillRect(0, 0, 200, 50);
            ctx.fillStyle = '#fff';
            ctx.fillText('RuiDing', 10, 10);
            return canvas.toDataURL();
        } catch (e) {
            return 'error';
        }
    }

    async hashComponents(obj) {
        const str = JSON.stringify(obj);
        if (crypto.subtle) {
            const data = new TextEncoder().encode(str);
            const hash = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }
}

window.deviceFingerprint = new DeviceFingerprint();
