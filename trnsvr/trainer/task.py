# task.py for delta-training
import numpy as np
from keys import keys
from model import get_data_from_db

if __name__ == '__main__':
    # test retrieving data from db
    idces, preds, data = get_data_from_db(keys)
    print(type(data))
    idces = np.array(idces)
    preds = np.array(preds)
    data = np.array(data)
    print('shapes:', idces.shape, preds.shape, data.shape)