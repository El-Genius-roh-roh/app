import pgserver, sys
srv = pgserver.get_server("/home/onyxia/.local/pg/data", cleanup_mode=None)
print(srv.get_uri())
