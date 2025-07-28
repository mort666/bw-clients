!element server {
  icons = container "Icons" {
    description "The Icons service provides favicons for websites."
    clients -> server.icons "Requests icons for cleartext urls from" 
  }
}

dns = softwareSystem "DNS" {
  tags "External"
  tags "Icons"
}
