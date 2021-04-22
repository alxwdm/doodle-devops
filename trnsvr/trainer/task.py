# task.py for delta-training
import numpy as np
import tensorflow as tf
from model import get_data_from_db, read_dataset, train_and_evaluate

if __name__ == '__main__':

    """
    # test retrieving data from db
    data_gen = get_data_from_db()
    for data, idces in data_gen:
        idces = np.array(idces)
        data = np.array(data)
        print('shapes:', idces.shape, data.shape)

    # test tensorflow data pipeline
    ds = read_dataset(mode='train')
    for feat, label in ds.take(1):
        print(tf.shape(feat), tf.shape(label))
        #print(feat, label)
    """
    # train model with input from database and export as tjfs model
    train_and_export()
