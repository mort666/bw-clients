# Person types
user = person "Bitwarden User" "An end user of the Bitwarden System"
system_admin = person "System Admin" "Either a Bitwarden site-reliability engineer or administrator of a self-hosted instance" {
  tags "Bitwarden Employee" "Self-Host Admin"
}


bw_controlled = group "Bitwarden Controlled" {
  # Bitwarden staff
  customer_success = person "Customer Success" "A customer success engineer. Inspects bitwarden state through the admin portal and internal tools" {
    tags "Bitwarden Employee"
  }
  
  # Root systems
  server = softwareSystem "Bitwarden Server" {
    api = container "API" {
      billing = component "Billing" {
        tags "Billing"
      }
      tags "API"
    }
    events = container "Events" {
      tags "Events"
    }
    notifications = container "Notifications"
  }
  clients = softwareSystem "Clients" {
    web = container "Web Application" {
      tags "Web"
    }
    browser_extension = container "Browser Extension" {
      tags "Browser"
    }
    cli = container "CLI" {
      tags "CLI"
    }
    desktop = container "Desktop Application" {
      tags "Desktop"
    }
  }
  key_connector = softwareSystem "Key Connector" 
}

self_hosted_instances = softwareSystem "Self-Hosted Instances" {
  tags "Self-Hosted"
  tags "External"
  description "Self-hosted instances of Bitwarden servers"
}

external_websites = softwareSystem "External Websites" {
  tags "External"
  tags "Icons"
}
