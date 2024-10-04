<script lang="ts">
import { computed, defineComponent, ref, toRefs } from "vue";
import { onClickOutside, useClipboard } from "@vueuse/core";
import { useWallet } from "@/useWallet";
import WalletConnectButton from "./WalletConnectButton.vue";
import WalletIcon from "./WalletIcon.vue";
import WalletModalProvider from "./WalletModalProvider.vue";
export default defineComponent({
  components: {
    WalletConnectButton,
    WalletIcon,
    WalletModalProvider,
  },
  props: {
    featured: { type: Number, default: 3 },
    container: { type: String, default: "body" },
    logo: String,
    dark: Boolean,
  },
  setup(props) {
    const { featured, container, logo, dark } = toRefs(props);
    const { publicKey, wallet, disconnect } = useWallet();

    const dropdownPanel = ref<HTMLElement>();
    const dropdownOpened = ref(false);
    const openDropdown = () => {
      dropdownOpened.value = true;
    };
    const closeDropdown = () => {
      dropdownOpened.value = false;
    };
    onClickOutside(dropdownPanel, closeDropdown);

    const publicKeyBase58 = computed(() => publicKey.value?.toBase58());
    const publicKeyTrimmed = computed(() => {
      if (!wallet.value || !publicKeyBase58.value) return null;
      return (
        publicKeyBase58.value.slice(0, 4) +
        ".." +
        publicKeyBase58.value.slice(-4)
      );
    });
    const {
      copy,
      copied: addressCopied,
      isSupported: canCopy,
    } = useClipboard();
    const copyAddress = () =>
      publicKeyBase58.value && copy(publicKeyBase58.value);

    // Define the bindings given to scoped slots.
    const scope = {
      featured,
      container,
      logo,
      dark,
      wallet,
      publicKey,
      publicKeyTrimmed,
      publicKeyBase58,
      canCopy,
      addressCopied,
      dropdownPanel,
      dropdownOpened,
      openDropdown,
      closeDropdown,
      copyAddress,
      disconnect,
    };

    return {
      scope,
      ...scope,
    };
  },
});
type WalletModelProviderScope = {
  dark: Ref<boolean>;
  logo: Ref<string | undefined>;
  hasLogo: Ref<boolean>;
  featured: Ref<number>;
  container: Ref<string>;
  modalPanel: Ref<HTMLElement | null>;
  modalOpened: Ref<boolean>;
  openModal: () => void;
  closeModal: () => void;
  expandedWallets: Ref<boolean>;
  walletsToDisplay: Ref<Wallet[]>;
  featuredWallets: Ref<Wallet[]>;
  hiddenWallets: Ref<Wallet[]>;
  selectWallet: (name: WalletName) => void;
};

export default defineComponent({
  components: {
    WalletIcon,
  },
  props: {
    featured: { type: Number, default: 3 },
    container: { type: String, default: "body" },
    logo: String,
    dark: Boolean,
  },
  setup(this: void, props, { slots }): WalletModalProviderRawBindings {
    const { featured, container, logo, dark } = toRefs(props);
    const modalPanel = ref(null) as Ref<HTMLElement | null>;
    const modalOpened = ref(false);
    const openModal = () => (modalOpened.value = true);
    const closeModal = () => (modalOpened.value = false);
    const hasLogo = computed(() => !!slots.logo || !!logo.value);

    const { wallets, select: selectWallet } = useWallet();
    const orderedWallets = computed(() => {
      const installed: Wallet[] = [];
      const notDetected: Wallet[] = [];
      const loadable: Wallet[] = [];

      wallets.value.forEach((wallet) => {
        if (wallet.readyState === WalletReadyState.NotDetected) {
          notDetected.push(wallet);
        } else if (wallet.readyState === WalletReadyState.Loadable) {
          loadable.push(wallet);
        } else if (wallet.readyState === WalletReadyState.Installed) {
          installed.push(wallet);
        }
      });

      return [...installed, ...loadable, ...notDetected];
    });

    const expandedWallets = ref(false);
    const featuredWallets = computed(() =>
      orderedWallets.value.slice(0, featured.value)
    );
    const hiddenWallets = computed(() =>
      orderedWallets.value.slice(featured.value)
    );
    const walletsToDisplay = computed(() =>
      expandedWallets.value ? wallets.value : featuredWallets.value
    );

    // Close the modal when clicking outside of it or when pressing Escape.
    onClickOutside(modalPanel, closeModal);
    onKeyStroke("Escape", closeModal);

    // Ensures pressing Tab backwards and forwards stays within the modal.
    onKeyStroke("Tab", (event: KeyboardEvent) => {
      const focusableElements =
        modalPanel.value?.querySelectorAll("button") ?? [];
      const firstElement = focusableElements?.[0];
      const lastElement = focusableElements?.[focusableElements.length - 1];

      if (
        event.shiftKey &&
        document.activeElement === firstElement &&
        lastElement
      ) {
        lastElement.focus();
        event.preventDefault();
      } else if (
        !event.shiftKey &&
        document.activeElement === lastElement &&
        firstElement
      ) {
        firstElement.focus();
        event.preventDefault();
      }
    });

    // Bring focus inside the modal when it opens.
    watch(modalOpened, (isOpened) => {
      if (!isOpened) return;
      nextTick(() =>
        modalPanel.value?.querySelectorAll("button")?.[0]?.focus()
      );
    });

    // Lock the body scroll when the modal opens.
    const scrollLock = useScrollLock(document.body);
    watch(modalOpened, (isOpened) => (scrollLock.value = isOpened));

    // Define the bindings given to scoped slots.
    const scope = {
      dark,
      logo,
      hasLogo,
      featured,
      container,
      modalPanel,
      modalOpened,
      openModal,
      closeModal,
      expandedWallets,
      walletsToDisplay,
      featuredWallets,
      hiddenWallets,
      selectWallet,
    };

    return {
      scope,
      ...scope,
    };
  },
});
</script>

<template>
  <wallet-modal-provider
    :featured="featured"
    :container="container"
    :logo="logo"
    :dark="dark"
  >
    <template #default="modalScope">
      <slot v-bind="{ ...modalScope, ...scope }">
        <button
          v-if="!wallet"
          class="swv-button swv-button-trigger"
          @click="modalScope.openModal"
        >
          Select Wallet
        </button>
        <wallet-connect-button
          v-else-if="!publicKeyBase58"
        ></wallet-connect-button>
        <div v-else class="swv-dropdown">
          <slot name="dropdown-button" v-bind="{ ...modalScope, ...scope }">
            <button
              class="swv-button swv-button-trigger"
              :style="{ pointerEvents: dropdownOpened ? 'none' : 'auto' }"
              :aria-expanded="dropdownOpened"
              :title="publicKeyBase58"
              @click="openDropdown"
            >
              <wallet-icon :wallet="wallet"></wallet-icon>
              <p v-text="publicKeyTrimmed"></p>
            </button>
          </slot>
          <slot name="dropdown" v-bind="{ ...modalScope, ...scope }">
            <ul
              aria-label="dropdown-list"
              class="swv-dropdown-list"
              :class="{ 'swv-dropdown-list-active': dropdownOpened }"
              ref="dropdownPanel"
              role="menu"
            >
              <slot name="dropdown-list" v-bind="{ ...modalScope, ...scope }">
                <li
                  v-if="canCopy"
                  @click="copyAddress"
                  class="swv-dropdown-list-item"
                  role="menuitem"
                >
                  {{ addressCopied ? "Copied" : "Copy address" }}
                </li>
                <li
                  @click="
                    modalScope.openModal();
                    closeDropdown();
                  "
                  class="swv-dropdown-list-item"
                  role="menuitem"
                >
                  Change wallet
                </li>
                <li
                  @click="
                    disconnect();
                    closeDropdown();
                  "
                  class="swv-dropdown-list-item"
                  role="menuitem"
                >
                  Disconnect
                </li>
              </slot>
            </ul>
          </slot>
        </div>
      </slot>
    </template>

    <!-- Enable modal overrides. -->
    <template #overlay="modalScope">
      <slot name="modal-overlay" v-bind="{ ...modalScope, ...scope }"></slot>
    </template>
    <template #modal="modalScope">
      <slot name="modal" v-bind="{ ...modalScope, ...scope }"></slot>
    </template>
  </wallet-modal-provider>
</template>
