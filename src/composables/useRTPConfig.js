import { reactive } from 'vue';

const STORAGE_KEY = 'crashgame_rtp_config';

/**
 * RTP Configuration State (Singleton)
 * Manages Return to Player percentage settings
 */
const rtpConfig = reactive({
  rtpFactor: 0.97, // Default RTP factor (97%)
  rtpPercentage: 97.0 // Display percentage
});

// Load from localStorage on initialization
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const data = JSON.parse(stored);
    if (data.rtpFactor !== undefined && data.rtpFactor > 0 && data.rtpFactor <= 1) {
      rtpConfig.rtpFactor = data.rtpFactor;
      rtpConfig.rtpPercentage = data.rtpFactor * 100;
    }
  }
} catch (error) {
  console.error('Failed to load RTP config:', error);
}

/**
 * Save RTP configuration to localStorage
 */
function saveConfig() {
  try {
    const data = {
      rtpFactor: rtpConfig.rtpFactor,
      rtpPercentage: rtpConfig.rtpPercentage
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save RTP config:', error);
  }
}

/**
 * RTP Configuration Composable
 */
export function useRTPConfig() {
  /**
   * Set RTP percentage (0-100)
   * @param {number} percentage - RTP percentage (e.g., 97 for 97%)
   */
  function setRTPPercentage(percentage) {
    // Clamp between 1% and 100%
    const clamped = Math.min(Math.max(percentage, 1), 100);
    rtpConfig.rtpPercentage = clamped;
    rtpConfig.rtpFactor = clamped / 100;
    saveConfig();
  }

  /**
   * Set RTP factor directly (0-1)
   * @param {number} factor - RTP factor (e.g., 0.97 for 97%)
   */
  function setRTPFactor(factor) {
    // Clamp between 0.01 and 1.0
    const clamped = Math.min(Math.max(factor, 0.01), 1.0);
    rtpConfig.rtpFactor = clamped;
    rtpConfig.rtpPercentage = clamped * 100;
    saveConfig();
  }

  /**
   * Get current RTP factor for calculations
   * @returns {number} Current RTP factor
   */
  function getRTPFactor() {
    return rtpConfig.rtpFactor;
  }

  /**
   * Get current RTP percentage for display
   * @returns {number} Current RTP percentage
   */
  function getRTPPercentage() {
    return rtpConfig.rtpPercentage;
  }

  /**
   * Reset to default RTP (97%)
   */
  function resetToDefault() {
    setRTPPercentage(97);
  }

  return {
    rtpConfig,
    setRTPPercentage,
    setRTPFactor,
    getRTPFactor,
    getRTPPercentage,
    resetToDefault
  };
}
