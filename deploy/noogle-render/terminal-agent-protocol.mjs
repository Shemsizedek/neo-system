// NSEC-117: shared terminal-agent capability contract (no executor).
// Android Termux, Linux desktops and approved companion apps can implement this.
// The Render public service MUST NOT execute arbitrary commands.
export const TERMINAL_AGENT_PROTOCOL='noogle-terminal-agent/v1';
export function validateAgentAnnouncement(announcement){
 if(!announcement || announcement.protocol!==TERMINAL_AGENT_PROTOCOL ||
    !['android-termux','linux','chromeos-linux','windows','macos'].includes(announcement.platform) ||
    typeof announcement.devicePublicKey!=='string'||announcement.devicePublicKey.length<32 ||
    announcement.devicePublicKey.length>8192)throw Error('invalid_agent_announcement');
 return Object.freeze({protocol:TERMINAL_AGENT_PROTOCOL,platform:announcement.platform,
   features:['session-request','explicit-local-approval','terminal-output-stream'],authenticated:false,
   terminalEnabled:false});
}
