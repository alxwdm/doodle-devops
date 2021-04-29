# model.py for delta-training
import tensorflow as tf
import psycopg2
import subprocess
import numpy as np
from keys import keys

MODEL_DIR = './trainer/model/'
BATCH_SIZE = 128
BUFFER_SIZE = 256
TRAIN_STEPS = 2
KEYS = keys

def get_data_from_db(mode='train', limit=10000, batch_size=-1):
    """
    Connect to the PostgreSQL database server and
    retrieve data from train or test split according to mode.
    The most recent data is queried using "limit".
    Data is retrieved in batches of batch_size.
    To load everything in one step, set batch_size to -1 (default).
    """
    # convert string types to fit tf args input
    if isinstance(mode, bytes):
        mode = mode.decode('utf-8')
    else:
        mode = str(mode)
    conn = None
    try:
        # connect to the PostgreSQL server
        #print('Connecting to the PostgreSQL database...')
        conn = psycopg2.connect(**KEYS)
        """
        for debugging: test connection by printing db version 
        with conn.cursor() as curs:
            curs.execute('SELECT version()')
            db_version = curs.fetchone()
            print('Success! PostgreSQL database version:')
            print(db_version)
        """
        # retrieve data from db
        with conn.cursor() as curs:
            curs.execute(
                '''
                SELECT idx, data 
                FROM doodles 
                WHERE split = %s
                ORDER BY insert_date DESC
                LIMIT %s
                ''',(mode, limit))
            # fetch data depending on batch_size setting
            if batch_size<0:
                results = curs.fetchall()
                idces, data = map(list, zip(*results))
                # yield one feature, label pair at a time
                for idx, img in zip(idces, data):
                    yield img, [idx]
            else:
                # fetch first batch
                results = curs.fetchmany(batch_size)
                idces, data = map(list, zip(*results))
                # yield one feature, label pair at a time
                for idx, img in zip(idces, data):
                    yield img, [idx]
                # fetch consecutive batches
                while results:
                    results = curs.fetchmany(batch_size)
                    idces, data = map(list, zip(*results))
                    # yield one feature, label pair at a time
                    for idx, img in zip(idces, data):
                        yield img, [idx]
    # error empty database
    except ValueError:
        print('Database appears to be empty.')
        return None                      
    # error during connection
    except (Exception, psycopg2.DatabaseError) as error:
        print('Database connection failed.')
        print(error)
    # close connection
    finally:
        if conn is not None:
            conn.close()
            #print('Database connection closed.')

def read_dataset(mode='train'):
    """
    Gets data from PostgreSQL DB and converts it into a tf.data.Dataset.
    """
    # preprocessing functions
    def _fixup_shape(features, label):
        features = tf.reshape(features, [28, 28, 1])
        label = tf.squeeze(label)
        return features, label
    def _normalize(features, label):
        features = tf.math.divide(features, 255)
        return features, label

    # create tf.Dataset by querying database
    ds = tf.data.Dataset.from_generator(
            get_data_from_db,
            args=[mode], 
            output_types=(tf.float32, tf.int32)
        )
    # apply preprocessing steps
    ds = ds.map(_fixup_shape) \
           .map(_normalize)
    # shuffle, batch and repeat depending on mode
    if mode == 'train':
        ds = ds.shuffle(buffer_size=BUFFER_SIZE).batch(BATCH_SIZE).prefetch(2)
    else:
        ds = ds.batch(BATCH_SIZE).prefetch(2)

    return ds

def train_and_export():
    """
    Trains a pre-trained model with database input and exports it to tfjs.
    """
    # load pretrained model (either latest or original pretrained model)
    try:
        model = tf.keras.models.load_model(MODEL_DIR + 'model_latest.h5')
    except:
        model = tf.keras.models.load_model(MODEL_DIR + 'model_pretrn.h5')
    # get datasets
    train_ds = read_dataset(mode='train')
    test_ds = read_dataset(mode='test')
    # get model loss before training
    pre_loss = model.evaluate(test_ds, verbose=2)[0]
    # delta-training
    history = model.fit(train_ds, 
                        epochs=TRAIN_STEPS, 
                        steps_per_epoch=None,
                        validation_data=test_ds,
                        validation_freq=1,
                        verbose=2)
    # get model loss after training (latest epoch)
    post_loss = history.history['val_loss'][-1]
    # save and export model if updated model has smaller (or equal) loss
    if post_loss <= pre_loss:
        model.save(MODEL_DIR + 'model_latest.h5')
        #print('Exporting model to tfjs format...')
        subprocess.run(['tensorflowjs_converter', '--input_format=keras', 
                    MODEL_DIR + 'model_latest.h5', MODEL_DIR + 'tfjs_export'])
        #print('Model exported to /tfjs_export.')
    return None
