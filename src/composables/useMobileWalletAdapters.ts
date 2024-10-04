
import {
  createDefaultAuthorizationResultCache,
  createDefaultAddressSelector,
  SolanaMobileWalletAdapter,
  SolanaMobileWalletAdapterWalletName,
  createDefaultWalletNotFoundHandler
} from "@solana-mobile/wallet-adapter-mobile";
import type { Adapter } from "@solana/wallet-adapter-base";
import type { Cluster } from "@solana/web3.js";
import { computed, Ref } from "vue";


export function useMobileWalletAdapters(
  adapters: Ref<Adapter[]>,
  uriForAppIdentity: string | null,
  cluster: Ref<Cluster>,
  isMobile: Ref<boolean>
): Ref<Adapter[]> {
  const mwaAdapter = computed(() => {
    if (!isMobile.value) return null;

    const existingMobileWalletAdapter = adapters.value.find(
      (adapter) => adapter.name === SolanaMobileWalletAdapterWalletName
    );
    if (existingMobileWalletAdapter) {
      return existingMobileWalletAdapter;
    }
    
    return new SolanaMobileWalletAdapter({
      onWalletNotFound: createDefaultWalletNotFoundHandler(),
      addressSelector: createDefaultAddressSelector(),
      appIdentity: { uri: uriForAppIdentity || undefined },
      authorizationResultCache: createDefaultAuthorizationResultCache(),
      cluster: cluster.value,
    });
  });

  return computed(() => {
    if (
      mwaAdapter.value == null ||
      adapters.value.indexOf(mwaAdapter.value) !== -1
    ) {
      return adapters.value;
    }

    return [mwaAdapter.value, ...adapters.value];
  });
}
