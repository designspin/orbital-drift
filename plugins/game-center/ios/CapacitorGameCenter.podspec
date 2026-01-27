Pod::Spec.new do |s|
  s.name = 'CapacitorGameCenter'
  s.version = '0.0.1'
  s.summary = 'Game Center Capacitor plugin'
  s.license = 'MIT'
  s.homepage = 'https://example.com'
  s.author = 'Local'
  s.source = { :path => '.' }
  s.source_files = 'Plugin/**/*.{swift,m,h}'
  s.ios.deployment_target = '13.0'
  s.dependency 'Capacitor'
end
