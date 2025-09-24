/**
 * Device fingerprinting utility for tracking user devices
 * This helps identify if a user is logging in from a new device
 */

export interface DeviceInfo {
    userAgent: string;
    screenResolution: string;
    timezone: string;
    language: string;
    platform: string;
    cookieEnabled: boolean;
    doNotTrack: string | null;
    colorDepth: number;
    pixelRatio: number;
}

export function generateDeviceFingerprint(): string {
    const deviceInfo = collectDeviceInfo();
    const fingerprint = createFingerprint(deviceInfo);
    return fingerprint;
}

export function collectDeviceInfo(): DeviceInfo {
    return {
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio,
    };
}

function createFingerprint(deviceInfo: DeviceInfo): string {
    // Create a hash-like string from device info
    const fingerprintString = [
        deviceInfo.userAgent,
        deviceInfo.screenResolution,
        deviceInfo.timezone,
        deviceInfo.language,
        deviceInfo.platform,
        deviceInfo.cookieEnabled.toString(),
        deviceInfo.colorDepth.toString(),
        deviceInfo.pixelRatio.toString(),
    ].join('|');

    // Simple hash function (in production, consider using crypto.subtle)
    let hash = 0;
    for (let i = 0; i < fingerprintString.length; i++) {
        const char = fingerprintString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
}

export function isSameDevice(storedFingerprint: string, currentFingerprint: string): boolean {
    return storedFingerprint === currentFingerprint;
}
