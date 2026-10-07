/**
 * Result of a share attempt:
 * - 'native'    — the system share sheet accepted the data,
 * - 'clipboard' — the URL was copied to the clipboard,
 * - 'failed'    — no Web Share and the clipboard refused (GOLIVE GL-4-024);
 *                 the caller must tell the user, otherwise the click is silent,
 * - false       — the user cancelled the native share sheet (stay silent).
 */
export type ShareResult = 'native' | 'clipboard' | 'failed' | false;

export function useShare() {
  const isNativeShareAvailable = typeof navigator !== 'undefined' && !!navigator.share;

  const share = async (data: { title: string; text: string; url: string }): Promise<ShareResult> => {
    if (isNativeShareAvailable) {
      try {
        await navigator.share(data);
        return 'native';
      } catch (err) {
        if ((err as Error).name === 'AbortError') return false;
      }
    }

    try {
      await navigator.clipboard.writeText(data.url);
      return 'clipboard';
    } catch {
      return 'failed';
    }
  };

  return { share, isNativeShareAvailable };
}
