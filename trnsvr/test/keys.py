import os

keys = {
  'dbname': os.getenv('PGDATABASE'),
  'user': os.getenv('PGUSER'),
  'password': os.getenv('PGPASSWORD'),
  'host': os.getenv('PGHOST'),
  'port': os.getenv('PGPORT')
};