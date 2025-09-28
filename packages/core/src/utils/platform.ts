import { isSSR } from '../utils/common';

export function isMac() {
  if (isSSR) {
    return false;
  }

  const macRE = /^Mac/i;
  let platform = navigator.platform;
  if ('userAgentData' in navigator) {
    platform = (navigator.userAgentData as { platform: string }).platform;
  }

  return macRE.test(platform);
}

export function isFirefox() {
  if (isSSR) {
    return false;
  }

  return /Firefox/i.test(navigator.userAgent);
}
