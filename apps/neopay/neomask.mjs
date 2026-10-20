// Call from NEO Pay startup after NeoMask has been installed/enabled for this site.
import {connectNeoMaskVault} from '../../packages/neomask-community-bridge/neomask-vault.mjs';
export function installNeoPayWalletBridge(scope=window){return connectNeoMaskVault(scope,{id:'neopay'});}
