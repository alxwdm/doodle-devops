# model.py for delta-training
#import tensorflow as tf
import psycopg2
import numpy as np

MODEL_DIR = './model/'

def get_data_from_db(keys, mode='train', batch_size=-1):
    """
    Connect to the PostgreSQL database server and
    retrieve data from train or test split according to mode.
    Data is retrieved in batches of batch_size.
    To load everything in one step, set batch_size to -1.
    """
    conn = None
    try:
        # connect to the PostgreSQL server
        print('Connecting to the PostgreSQL database...')
        conn = psycopg2.connect(**keys)
        # test connection by printing db version 
        with conn.cursor() as curs:
            curs.execute('SELECT version()')
            db_version = curs.fetchone()
            print('Success! PostgreSQL database version:')
            print(db_version)
        # retrieve data from db
        with conn.cursor() as curs:
            curs.execute(
                '''
                SELECT idx, pred, data 
                FROM doodles 
                WHERE split = \'{}\'
                '''.format(mode))
            # fetch data depending on batch_size setting
            # TODO: rewrite this
            while True:
                # fetch all and return results
                if batch_size<0:
                    results = curs.fetchall()
                    idces, preds, data = map(list, zip(*results))
                    return (idces, preds, data)
                # fetch batch and yield results
                else:
                    results = curs.fetchmany(batch_size)
                    if not results:
                        break
                    idces, preds, data = map(list, zip(*results))
                    # TODO turn into generator
                    raise NotImplementedError
    # error during connection
    except (Exception, psycopg2.DatabaseError) as error:
        print('Database connection failed.')
        print(error)
    # close connection
    finally:
        if conn is not None:
            conn.close()
            print('Database connection closed.')

def read_dataset(mode, train_steps):
    def _input_fn():
        # TODO
        dataset = None
        return dataset
    return _input_fn

def train_and_evaluate():
    # TODO
    return None
