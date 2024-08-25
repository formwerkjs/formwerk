import { isSSR } from '../utils/common';

export function isMac() {
  const macRE = /^Mac/i;
  if (isSSR) {
    return false;
  }

  let platform = navigator.platform;
  if ('userAgentData' in navigator) {
    platform = (navigator.userAgentData as { platform: string }).platform;
  }

  return macRE.test(platform);
}
