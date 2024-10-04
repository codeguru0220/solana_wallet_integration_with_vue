import type { Wallet } from "@/types";
import { Ref, watchEffect } from "vue";
import type { Adapter, WalletReadyState } from "@solana/wallet-adapter-base";



export function useReadyStateListeners(wallets: Ref<Wallet[]>) {
  watchEffect((onInvalidate) => {
    function handleReadyStateChange(
      readyState: WalletReadyState,
      this: Adapter
    ) {
      const prevWallets = wallets.value;
      const index = prevWallets.findIndex(({ adapter }) => adapter === this);
      if (index === -1) return;

      wallets.value = [
        ...prevWallets.slice(0, index),
        { adapter: this, readyState },
        ...prevWallets.slice(index + 1),
      ];
    }

    wallets.value.forEach(({ adapter }) =>
      adapter.on("readyStateChange", handleReadyStateChange, adapter)
    );

    onInvalidate(() =>
      wallets.value.forEach(({ adapter }) =>
        adapter.off("readyStateChange", handleReadyStateChange, adapter)
      )
    );
  });
}

