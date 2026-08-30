variable "project_id" {
  description = "Google Cloud project ID that will own NEO VPN Node 001."
  type        = string
}

variable "region" {
  description = "Google Cloud region for the reserved public IP and gateway subnet."
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "Google Cloud zone for NEO VPN Node 001."
  type        = string
  default     = "us-central1-a"
}

variable "machine_type" {
  description = "Compute Engine machine type for the gateway."
  type        = string
  default     = "e2-small"
}

variable "gateway_subnet_cidr" {
  description = "CIDR for the dedicated Google Cloud subnet. Keep this separate from the WireGuard overlay 10.144.0.0/16."
  type        = string
  default     = "10.145.1.0/24"
}

variable "wireguard_source_ranges" {
  description = "CIDRs allowed to reach UDP 51820. Use 0.0.0.0/0 only when roaming clients require it, then rely on WireGuard cryptographic authentication."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
