// @ts-strict-ignore
import { useEffect, useState } from 'react';

import type { Handlers } from 'loot-core-server/types/handlers';

import { send } from 'loot-core/platform/client/fetch';

export function useSendPlatformRequest<K extends keyof Handlers>(
  name: K,
  args?: Parameters<Handlers[K]>[0],
  options?: { catchErrors?: boolean },
) {
  const [data, setData] = useState<Awaited<ReturnType<Handlers[K]>>>(null);
  const [isLoading, setIsLoading] = useState<boolean | null>(null);

  useEffect(() => {
    async function run() {
      setIsLoading(true);
      setData(await send(name, args, options));
      setIsLoading(false);
    }

    run();
  }, [name, args, options]);

  return {
    data,
    isLoading,
  };
}
