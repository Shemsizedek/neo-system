export function trustedSenderOrigin(sender,message,extensionId){
 if(!extensionId||sender?.id!==extensionId||sender.frameId!==0||typeof sender.url!=='string')throw Error('untrusted_extension_sender');
 const url=new URL(sender.url);
 if(url.protocol!=='https:'||url.username||url.password||message?.origin!==url.origin)throw Error('origin_mismatch');
 return url.origin;
}
