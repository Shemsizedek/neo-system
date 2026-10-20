// Call from Counterpay startup after NeoMask has been installed/enabled for this site.
import {connectNeoMaskVault} from '../../packages/neomask-community-bridge/neomask-vault.mjs';
export function installCounterpayWalletBridge(scope=window){return connectNeoMaskVault(scope,{id:'counterpay'});}
