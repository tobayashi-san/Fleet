export function commandModifier(platform = typeof navigator === 'undefined' ? '' : navigator.platform): string {
  return /Mac|iPhone|iPad|iPod/i.test(platform) ? '⌘' : 'Ctrl';
}
