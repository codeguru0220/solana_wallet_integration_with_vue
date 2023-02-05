import type { Adapter } from "@solana/wallet-adapter-base";
import { WalletNotReadyError } from "@solana/wallet-adapter-base";
import type { Cluster } from "@solana/web3.js";
import type { Ref } from "vue";
import { ref, shallowRef } from "vue";
import {
  useAdapterListeners,
  useAutoConnect,
  useEnvironment,
  useErrorHandler,
  useMobileWalletAdapters,
  useReadyStateListeners,
  useSelectWalletName,
  useStandardWalletAdapters,
  useTransactionMethods,
  useUnloadingWindow,
  useWalletState,
  useWrapAdaptersInWallets,
} from "./composables";
import { WalletNotSelectedError } from "./errors";
import type { WalletStore, WalletStoreProps } from "./types";

export const createWalletStore = ({
  wallets: initialAdapters = [],
  autoConnect: initialAutoConnect = false,
  cluster: initialCluster = "mainnet-beta",
  onError,
  localStorageKey = "walletName",
}: WalletStoreProps): WalletStore => {
  // Initial variables and loading states.
  const cluster: Ref<Cluster> = ref(initialCluster);
  const connecting = ref<boolean>(false);
  const disconnecting = ref<boolean>(false);

  // From raw adapters to computed list of wallets.
  const rawAdapters: Ref<Adapter[]> = shallowRef(initialAdapters);
  const rawAdaptersWithSwa = useStandardWalletAdapters(rawAdapters);
  const { isMobile, uriForAppIdentity } = useEnvironment(rawAdaptersWithSwa);
  const adapters = useMobileWalletAdapters(
    rawAdaptersWithSwa,
    isMobile,
    uriForAppIdentity,
    cluster
  );
  const wallets = useWrapAdaptersInWallets(adapters);

  // Wallet selection and state.
  const { name, isUsingMwaAdapterOnMobile, select, deselect } =
    useSelectWalletName(localStorageKey, isMobile);
  const {
    wallet,
    publicKey,
    connected,
    readyState,
    ready,
    refreshWalletState,
  } = useWalletState(wallets, name);

  // Window listeners and error handling.
  const unloadingWindow = useUnloadingWindow(isUsingMwaAdapterOnMobile);
  const handleError = useErrorHandler(unloadingWindow, onError);

  // Wallet listeners.
  useReadyStateListeners(wallets);
  useAdapterListeners(
    wallet,
    unloadingWindow,
    isUsingMwaAdapterOnMobile,
    deselect,
    refreshWalletState,
    handleError
  );

  // Auto-connect feature.
  const autoConnect = useAutoConnect(
    initialAutoConnect,
    wallet,
    isUsingMwaAdapterOnMobile,
    connecting,
    connected,
    ready,
    deselect
  );

  // Transaction methods.
  const { sendTransaction, signTransaction, signAllTransactions, signMessage } =
    useTransactionMethods(wallet, handleError);

  // Connect the wallet.
  const connect = async (): Promise<void> => {
    if (connected.value || connecting.value || disconnecting.value) return;
    if (!wallet.value) throw handleError(new WalletNotSelectedError());
    const adapter = wallet.value.adapter;
    if (!ready.value) throw handleError(new WalletNotReadyError(), adapter);

    try {
      connecting.value = true;
      await adapter.connect();
    } catch (error: any) {
      deselect();
      // handleError will also be called.
      throw error;
    } finally {
      connecting.value = false;
    }
  };

  // Disconnect the wallet adapter.
  const disconnect = async (): Promise<void> => {
    if (disconnecting.value || !wallet.value) return;
    try {
      disconnecting.value = true;
      await wallet.value.adapter.disconnect();
    } finally {
      disconnecting.value = false;
    }
  };

  // Return the created store.
  return {
    // Props.
    wallets,
    autoConnect,
    cluster,

    // Data.
    wallet,
    publicKey,
    readyState,
    ready,
    connected,
    connecting,
    disconnecting,

    // Methods.
    select,
    connect,
    disconnect,
    sendTransaction,
    signTransaction,
    signAllTransactions,
    signMessage,
  };
};
