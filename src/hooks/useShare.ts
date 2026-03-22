export function useShare() {
  const isNativeShareAvailable = typeof navigator !== 'undefined' && !!navigator.share;

  const share = async (data: { title: string; text: string; url: string }): Promise<'native' | 'clipboard' | false> => {
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
      return false;
    }
  };

  return { share, isNativeShareAvailable };
}
