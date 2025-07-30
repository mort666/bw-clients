component clients.desktop "desktop_biometrics" {
  include *
}

component clients.desktop "desktop_biometrics_macos" {
  include *
  exclude "element.tag==Windows"
  exclude "element.tag==Linux"
}

component clients.desktop "desktop_biometrics_windows" {
  include *
  exclude "element.tag==MacOS"
  exclude "element.tag==Linux"
}

component clients.desktop "desktop_biometrics_linux" {
  include *
  exclude "element.tag==Windows"
  exclude "element.tag==MacOS"
}
