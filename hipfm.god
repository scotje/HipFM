God.watch do |w|
  w.name = "hipfm"
  w.dir = "/opt/hipfm"
  w.start = "/usr/bin/node server.js -f"
  w.log = '/opt/hipfm/hipfm.log'
  w.keepalive
end
