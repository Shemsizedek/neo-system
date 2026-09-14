export const NEO_HACKER_TAXONOMY = Object.freeze({
  'NH-PI-01': 'direct_prompt_injection',
  'NH-PI-02': 'indirect_content_injection',
  'NH-PI-03': 'encoded_or_obfuscated_instruction',
  'NH-PI-04': 'multimodal_instruction_injection',
  'NH-PI-05': 'rag_or_document_poisoning',
  'NH-PI-06': 'memory_poisoning',
  'NH-PI-07': 'tool_output_injection',
  'NH-PI-08': 'agent_plan_hijacking',
  'NH-PI-09': 'data_or_secret_exfiltration',
  'NH-PI-10': 'cross_agent_injection',
  'NH-PI-11': 'connector_or_plugin_poisoning',
  'NH-PI-12': 'jailbreak_or_social_engineering',
  'NH-PI-13': 'output_to_command_injection',
  'NH-PI-14': 'url_or_redirect_manipulation',
  'NH-PI-15': 'context_flooding_or_priority_confusion',
  'NH-PI-16': 'authority_or_role_impersonation',
  'NH-PI-17': 'tool_chain_privilege_escalation',
  'NH-PI-18': 'software_or_model_supply_chain_poisoning',
  'NH-PI-19': 'unauthorized_agent_persistence',
  'NH-PI-20': 'security_monitor_evasion',
  'NH-KG-01': 'suspicious_keyboard_hook',
  'NH-KG-02': 'accessibility_input_capture_abuse',
  'NH-KG-03': 'clipboard_secret_capture',
  'NH-KG-04': 'credential_field_interception',
  'NH-END-01': 'unexpected_privilege_change',
  'NH-END-02': 'suspicious_persistence_change',
  'NH-END-03': 'unknown_binary_network_egress'
});

export function isKnownThreatCode(code) {
  return Object.hasOwn(NEO_HACKER_TAXONOMY, code);
}
