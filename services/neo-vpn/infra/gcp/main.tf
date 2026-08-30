terraform {
  required_version = ">= 1.6.0"

  backend "gcs" {}

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

resource "google_compute_network" "neo_vpn" {
  name                    = "neo-vpn-network"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
}

resource "google_compute_subnetwork" "neo_vpn_gateway" {
  name          = "neo-vpn-gateway-subnet"
  region        = var.region
  network       = google_compute_network.neo_vpn.id
  ip_cidr_range = var.gateway_subnet_cidr

  private_ip_google_access = false
}

resource "google_service_account" "neo_vpn_node_001" {
  account_id   = "neo-vpn-node-001"
  display_name = "NEO VPN Node 001"
  description  = "Dedicated runtime identity for NEO VPN Node 001. No project roles are granted by this module."
}

resource "google_compute_address" "neo_vpn_node_001" {
  name   = "neo-vpn-node-001-ip"
  region = var.region
}

resource "google_compute_firewall" "wireguard" {
  name    = "neo-vpn-wireguard-51820"
  network = google_compute_network.neo_vpn.name

  direction = "INGRESS"
  priority  = 1000

  allow {
    protocol = "udp"
    ports    = ["51820"]
  }

  source_ranges           = var.wireguard_source_ranges
  target_service_accounts = [google_service_account.neo_vpn_node_001.email]
}

resource "google_compute_firewall" "iap_ssh" {
  name    = "neo-vpn-iap-ssh"
  network = google_compute_network.neo_vpn.name

  direction = "INGRESS"
  priority  = 1000

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges           = ["35.235.240.0/20"]
  target_service_accounts = [google_service_account.neo_vpn_node_001.email]
}

resource "google_compute_instance" "neo_vpn_node_001" {
  name         = "neo-vpn-node-001"
  machine_type = var.machine_type
  zone         = var.zone

  can_ip_forward = true

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 20
      type  = "pd-balanced"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.neo_vpn_gateway.id

    access_config {
      nat_ip = google_compute_address.neo_vpn_node_001.address
    }
  }

  metadata = {
    enable-oslogin = "TRUE"
  }

  metadata_startup_script = file("${path.module}/startup.sh")

  service_account {
    email  = google_service_account.neo_vpn_node_001.email
    scopes = ["cloud-platform"]
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

output "neo_vpn_network_name" {
  value       = google_compute_network.neo_vpn.name
  description = "Dedicated VPC used only by NEO VPN infrastructure."
}

output "neo_vpn_node_001_service_account" {
  value       = google_service_account.neo_vpn_node_001.email
  description = "Dedicated runtime service account attached to NEO VPN Node 001."
}
