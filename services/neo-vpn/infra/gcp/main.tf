terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

resource "google_compute_address" "neo_vpn_node_001" {
  name   = "neo-vpn-node-001-ip"
  region = var.region
}

resource "google_compute_firewall" "wireguard" {
  name    = "neo-vpn-wireguard-51820"
  network = var.network_name

  direction = "INGRESS"
  priority  = 1000

  allow {
    protocol = "udp"
    ports    = ["51820"]
  }

  source_ranges = var.wireguard_source_ranges
  target_tags   = ["neo-vpn-gateway"]
}

resource "google_compute_instance" "neo_vpn_node_001" {
  name         = "neo-vpn-node-001"
  machine_type = var.machine_type
  zone         = var.zone
  tags         = ["neo-vpn-gateway"]

  can_ip_forward = true

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 20
      type  = "pd-balanced"
    }
  }

  network_interface {
    network = var.network_name

    access_config {
      nat_ip = google_compute_address.neo_vpn_node_001.address
    }
  }

  metadata = {
    enable-oslogin = "TRUE"
  }

  metadata_startup_script = file("${path.module}/startup.sh")

  service_account {
    scopes = ["https://www.googleapis.com/auth/logging.write", "https://www.googleapis.com/auth/monitoring.write"]
  }

  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }

  lifecycle {
    prevent_destroy = true
  }
}

output "neo_vpn_node_001_public_ip" {
  value       = google_compute_address.neo_vpn_node_001.address
  description = "Public IPv4 endpoint for NEO VPN Node 001."
}
