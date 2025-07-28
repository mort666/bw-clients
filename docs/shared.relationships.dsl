# User Relationships
user -> clients.web "Uses"
user -> clients.browser_extension "Uses"
user -> clients.cli "Uses"
user -> clients.desktop "Uses"
admin -> clients.web "Administers Organizations"
provider -> clients.web "Administers Providers and Organizations"

# High-level Client Relationships
clients.web -> server.api "Makes requests to"
clients.browser_extension -> server.api "Makes requests to"
clients.cli -> server.api "Makes requests to"
clients.desktop -> server.api "Makes requests to"
clients.web -> server.identity "Authenticates with"
clients.browser_extension -> server.identity "Authenticates With"
clients.cli -> server.identity "Authenticates With"
clients.desktop -> server.identity "Authenticates With"
server.api -> server.identity "Validates JWTs with" {
  url "https://bitwarden.com"
}
clients -> server.events "Posts local usage events to"

# self host phone home
self_hosted_instances -> server.notifications "Sends push notification proxy requests to"
